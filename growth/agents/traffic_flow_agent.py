#!/usr/bin/env python3
"""
PRICEBASKET.IN — Traffic Flow Agent
=====================================
Goal: Keep active users >= 100 at all times.

Current baseline: ~2 active users / 30 min
Target:           100+ active users / 30 min

Three-layer strategy
────────────────────
1. REAL-TIME MONITOR   Check active visitors every 15 min.
                       If below threshold → fire ACQUISITION BURST across all channels.

2. ACQUISITION BURST   Simultaneously hits every traffic channel:
                       push notifications, WhatsApp, email blast, Twitter,
                       Reddit, trending blog post, IndexNow re-ping.

3. ON-SITE FLOW        For pages people land on, Claude patches CTAs and internal links
                       so each visitor views more pages (raises "active" count duration).

4. SOURCE ROUTING      Tracks which channel drove the spike. Doubles down on winners.
                       Logs to orchestrator for weekly report.

Run from orchestrator: every 15 min (push) + every 4 hours (flow analysis)
Direct: python traffic_flow_agent.py [--dry-run] [--verbose] [--once]
"""

import os
import sys
import json
import time
import datetime
import argparse
import threading
import requests

try:
    from dotenv import load_dotenv
    _base = os.path.dirname(__file__)
    load_dotenv(os.path.join(_base, ".env"))
    load_dotenv(os.path.join(_base, "..", "..", ".env"))
    load_dotenv(os.path.join(_base, "..", "..", "backend", ".env"))
except ImportError:
    pass

# ── Config ─────────────────────────────────────────────────────────────────────

BACKEND_API      = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
SITE_URL         = os.getenv("SITE_URL", "https://pricebasket.in")
ANTHROPIC_KEY    = os.getenv("ANTHROPIC_API_KEY", "")
AWS_REGION       = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL    = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")
# Use Bedrock when boto3 can find credentials (CLI config, instance role, etc.)
def _bedrock_available() -> bool:
    try:
        import boto3
        boto3.client("sts", region_name=AWS_REGION).get_caller_identity()
        return True
    except Exception:
        return False
USE_BEDROCK = _bedrock_available()
DRY_RUN          = os.getenv("AGENT_DRY_RUN", "false").lower() == "true"
ACTIVE_USER_GOAL = int(os.getenv("TRAFFIC_GOAL_ACTIVE_USERS", "100"))
MONITOR_WINDOW   = int(os.getenv("TRAFFIC_MONITOR_WINDOW_MIN", "30"))  # minutes
VERBOSE          = False

# Burst cooldown: don't fire more than once per N minutes to avoid spam
BURST_COOLDOWN_MIN = int(os.getenv("BURST_COOLDOWN_MIN", "45"))

# ── State (in-memory, reset on restart) ───────────────────────────────────────

_last_burst_at: datetime.datetime | None = None
_burst_history: list[dict] = []
_channel_scores: dict[str, float] = {
    "push":      0.0,
    "whatsapp":  0.0,
    "email":     0.0,
    "twitter":   0.0,
    "blog":      0.0,
    "reddit":    0.0,
    "trending":  0.0,
}

# ── Logging ────────────────────────────────────────────────────────────────────

def _log(msg: str, level: str = "INFO"):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    try:
        log_path = os.path.join(os.path.dirname(__file__), "traffic_flow.log")
        with open(log_path, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _verbose(msg: str):
    if VERBOSE:
        _log(msg, "DEBUG")


# ── Backend API helpers ────────────────────────────────────────────────────────

def _get(path: str, timeout: int = 15) -> dict | None:
    try:
        r = requests.get(f"{BACKEND_API}{path}", timeout=timeout)
        return r.json() if r.ok else None
    except Exception as e:
        _verbose(f"GET {path} failed: {e}")
        return None


def _post(path: str, payload: dict = {}, timeout: int = 20) -> dict | None:
    if DRY_RUN:
        _log(f"[DRY-RUN] POST {path} {payload}", "DRY")
        return {"status": "dry_run"}
    try:
        r = requests.post(f"{BACKEND_API}{path}", json=payload, timeout=timeout)
        return r.json() if r.ok else None
    except Exception as e:
        _verbose(f"POST {path} failed: {e}")
        return None


# ── Layer 1: Real-time monitoring ─────────────────────────────────────────────

def fetch_active_users() -> int:
    """
    Returns active visitors in the last MONITOR_WINDOW minutes.
    Uses /api/v1/growth/live (last 5 min) as primary, scales to 30-min window.
    Falls back to /api/v1/growth/metrics for session count.
    """
    data = _get("/api/v1/growth/live")
    if data and "active_visitors" in data:
        active = int(data.get("active_visitors", 0))
        _verbose(f"Live active visitors (5-min window): {active}")
        # The backend counts last 5 min; scale to approximate 30-min window
        # (assumes 6x persistence multiplier for typical session length)
        return active

    # Fallback: use session count from metrics endpoint
    metrics = _get("/api/v1/growth/metrics?days=1")
    if metrics:
        sessions = metrics.get("growth", {}).get("sessions", 0)
        # Very rough: sessions/day / 48 (30-min slots) = active per slot
        return max(0, sessions // 48)

    return 0


def is_burst_needed(active: int) -> bool:
    """True if below goal and burst cooldown has passed."""
    global _last_burst_at
    if active >= ACTIVE_USER_GOAL:
        return False
    if _last_burst_at:
        elapsed = (datetime.datetime.now() - _last_burst_at).total_seconds() / 60
        if elapsed < BURST_COOLDOWN_MIN:
            _verbose(f"Burst cooldown: {elapsed:.0f}/{BURST_COOLDOWN_MIN} min elapsed")
            return False
    return True


# ── Layer 2: Acquisition burst ────────────────────────────────────────────────

def _burst_push(results: dict):
    """Fire push notification to all subscribers — fastest channel (~seconds to site)."""
    try:
        r = _post("/api/v1/growth/push-broadcast", {
            "title":   "🔥 Top Deals Right Now on PriceBasket",
            "body":    "Prices dropping on Blinkit, JioMart & Zepto. Check before they go!",
            "url":     f"{SITE_URL}?utm_source=push&utm_medium=burst&utm_campaign=traffic_boost",
            "icon":    f"{SITE_URL}/icons/icon-192x192.png",
            "badge":   f"{SITE_URL}/icons/badge-72x72.png",
            "tag":     "traffic_boost",
            "renotify": True,
        })
        results["push"] = "sent" if r else "failed"
        _log(f"Push burst → {results['push']}")
    except Exception as e:
        results["push"] = f"error: {e}"


def _burst_whatsapp(results: dict):
    """Broadcast WhatsApp message to opted-in subscribers."""
    try:
        r = _post("/api/v1/growth/whatsapp-broadcast", {
            "template": "traffic_burst_deals",
            "params":   {"site_url": SITE_URL},
            "utm":      "utm_source=whatsapp&utm_medium=burst&utm_campaign=traffic_boost",
        })
        results["whatsapp"] = "sent" if r else "failed"
        _log(f"WhatsApp burst → {results['whatsapp']}")
    except Exception as e:
        results["whatsapp"] = f"error: {e}"


def _burst_email(results: dict):
    """Send flash-deal email to engaged subscribers (last 7-day openers)."""
    try:
        r = _post("/api/v1/growth/email/flash-blast", {
            "subject":  "⚡ Flash deals live now — prices dropping!",
            "segment":  "engaged_7d",
            "utm":      "utm_source=email&utm_medium=burst&utm_campaign=traffic_boost",
        })
        results["email"] = "sent" if r else "failed"
        _log(f"Email burst → {results['email']}")
    except Exception as e:
        results["email"] = f"error: {e}"


def _burst_twitter(results: dict):
    """Post an urgent deals tweet immediately (bypasses schedule)."""
    try:
        r = _post("/api/v1/growth/social/tweet", {
            "mode":  "burst",
            "tone":  "urgent",
            "topic": "top_deals_now",
            "utm":   "utm_source=twitter&utm_medium=burst&utm_campaign=traffic_boost",
        })
        results["twitter"] = "sent" if r else "failed"
        _log(f"Twitter burst → {results['twitter']}")
    except Exception as e:
        results["twitter"] = f"error: {e}"


def _burst_trending_blog(results: dict):
    """Trigger a trending-topic blog post — new content = fresh Google traffic."""
    try:
        r = _post("/api/v1/growth/content/generate", {
            "source":  "traffic_burst",
            "topic":   "best_grocery_deals_today",
            "urgency": "high",
        })
        slug = (r or {}).get("slug", "")
        results["blog"] = f"slug:{slug}" if slug else "skipped"
        _log(f"Blog burst → {results['blog']}")

        # Immediately ping IndexNow so Google sees it in minutes
        if slug:
            _post("/api/v1/seo/indexnow", {
                "urls": [f"{SITE_URL}/blog/{slug}"]
            })
    except Exception as e:
        results["blog"] = f"error: {e}"


def _burst_reddit(results: dict):
    """Drop a helpful Reddit comment in r/IndianGroceries or r/DesiDeals."""
    try:
        r = _post("/api/v1/growth/reddit/answer", {
            "subreddits": ["IndianGroceries", "DesiDeals", "frugalIndia", "IndiaShops"],
            "mode":       "burst",
            "utm":        "utm_source=reddit&utm_medium=burst&utm_campaign=traffic_boost",
        })
        results["reddit"] = "posted" if r else "failed"
        _log(f"Reddit burst → {results['reddit']}")
    except Exception as e:
        results["reddit"] = f"error: {e}"


def _burst_indexnow(results: dict):
    """Re-ping IndexNow for top 20 pages — pushes them back to top of Google queue."""
    try:
        pages = _get("/api/v1/content/top-pages?limit=20")
        urls = []
        if pages:
            urls = [f"{SITE_URL}{p['slug']}" for p in (pages.get("pages") or []) if p.get("slug")]
        # Always include homepage + blog index
        urls = list({SITE_URL, f"{SITE_URL}/blog", f"{SITE_URL}/compare"} | set(urls))
        r = _post("/api/v1/seo/indexnow", {"urls": urls})
        results["indexnow"] = f"{len(urls)} urls pinged" if r else "failed"
        _log(f"IndexNow burst → {results['indexnow']}")
    except Exception as e:
        results["indexnow"] = f"error: {e}"


def fire_acquisition_burst(active: int) -> dict:
    """
    Simultaneously fires all traffic channels in parallel threads.
    Returns a results dict with status per channel.
    """
    global _last_burst_at, _burst_history

    _log(f"🚨 BURST TRIGGERED — active users: {active} (goal: {ACTIVE_USER_GOAL})", "BURST")
    _last_burst_at = datetime.datetime.now()

    results: dict = {}

    # Run all channels in parallel — don't wait for one to block another
    threads = [
        threading.Thread(target=_burst_push,          args=(results,), daemon=True),
        threading.Thread(target=_burst_whatsapp,      args=(results,), daemon=True),
        threading.Thread(target=_burst_email,         args=(results,), daemon=True),
        threading.Thread(target=_burst_twitter,       args=(results,), daemon=True),
        threading.Thread(target=_burst_trending_blog, args=(results,), daemon=True),
        threading.Thread(target=_burst_reddit,        args=(results,), daemon=True),
        threading.Thread(target=_burst_indexnow,      args=(results,), daemon=True),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=25)  # max 25s per channel

    _burst_history.append({
        "fired_at":    _last_burst_at.isoformat(),
        "active_then": active,
        "channels":    dict(results),
    })

    _log(f"Burst complete. Channels: {json.dumps(results)}", "BURST")
    return results


# ── Layer 3: On-site flow optimisation ────────────────────────────────────────

def fetch_page_metrics() -> list[dict]:
    """Returns top_pages list from the metrics endpoint (with views + conversion signals)."""
    data = _get("/api/v1/growth/metrics?days=7")
    if not data:
        return []
    pages  = data.get("top_pages", [])
    searches = data.get("top_searches", [])
    return [{"searches": searches, **p} for p in pages] if pages else []


def _ask_claude(prompt: str, max_tokens: int = 800) -> str | None:
    """
    Call Claude via Bedrock (if AWS keys set) or Anthropic direct.
    Bedrock: set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env
    Anthropic: set ANTHROPIC_API_KEY in .env
    """
    system = (
        "You are a conversion-rate optimisation expert for pricebasket.in, "
        "an Indian grocery price comparison site (Blinkit, JioMart, Zepto, Swiggy Instamart). "
        "Write in clear, punchy English. No markdown unless asked."
    )

    if USE_BEDROCK:
        try:
            import boto3, json as _json
            client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
            body = _json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            })
            resp = client.invoke_model(modelId=BEDROCK_MODEL, body=body)
            result = _json.loads(resp["body"].read())
            return result["content"][0]["text"].strip()
        except Exception as e:
            _verbose(f"Bedrock call failed: {e}")
            return None

    if ANTHROPIC_KEY:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text.strip()
        except Exception as e:
            _verbose(f"Anthropic call failed: {e}")
            return None

    _verbose("No AI key set (ANTHROPIC_API_KEY or AWS_ACCESS_KEY_ID) — skipping Claude call")
    return None


def generate_cta_patches(pages: list[dict]) -> list[dict]:
    """
    For each high-exit page, ask Claude for a better above-the-fold CTA.
    Returns list of {page, new_cta, reason}.
    """
    if not pages:
        return []

    # Focus on top 5 pages that are getting views but possibly low conversion
    targets = pages[:5]
    page_list = "\n".join(
        f"- {p.get('page', '/')} ({p.get('views', 0)} views)"
        for p in targets
    )
    top_searches = targets[0].get("searches", [])[:10] if targets else []

    prompt = (
        f"These are the top landing pages on pricebasket.in by pageviews in the last 7 days:\n"
        f"{page_list}\n\n"
        f"Top search queries users typed: {', '.join(top_searches)}\n\n"
        "For each page, write ONE punchy above-the-fold CTA headline (max 12 words) "
        "designed to stop a bouncing visitor and make them compare prices. "
        "Then write ONE supporting subtext (max 20 words). "
        "Format each as:\n"
        "PAGE: /page-path\n"
        "CTA: <headline>\n"
        "SUB: <subtext>\n"
        "REASON: <why this will reduce bounce>\n"
        "---\n"
        "Prioritise urgency, savings, and trust signals (real prices, 3 platforms)."
    )

    raw = _ask_claude(prompt, max_tokens=1000)
    if not raw:
        return []

    patches = []
    for block in raw.split("---"):
        block = block.strip()
        if not block:
            continue
        lines = {
            l.split(":", 1)[0].strip(): l.split(":", 1)[1].strip()
            for l in block.splitlines()
            if ":" in l
        }
        if lines.get("PAGE"):
            patches.append({
                "page":   lines.get("PAGE", ""),
                "cta":    lines.get("CTA", ""),
                "sub":    lines.get("SUB", ""),
                "reason": lines.get("REASON", ""),
            })
    return patches


def apply_cta_patches(patches: list[dict]):
    """Push CTA patches to backend for each page."""
    for p in patches:
        slug = p.get("page", "").lstrip("/")
        if not slug or not p.get("cta"):
            continue
        result = _post(f"/api/v1/content/pages/{slug}/cta", {
            "above_fold_cta":  p["cta"],
            "above_fold_sub":  p.get("sub", ""),
            "source":          "traffic_flow_agent",
            "applied_at":      datetime.datetime.now().isoformat(),
        })
        status = "applied" if result else "failed/no-endpoint"
        _log(f"CTA patch → {p['page']}: '{p['cta']}' [{status}]")


def trigger_internal_link_refresh(pages: list[dict]):
    """
    Ask the internal link agent to re-scan high-traffic pages.
    More internal links = more pages/session = more active users counted.
    """
    slugs = [p.get("page", "").lstrip("/") for p in pages[:8] if p.get("page")]
    for slug in slugs:
        if not slug or slug in ("", "/"):
            continue
        _post(f"/api/v1/growth/internal-links/scan", {"slug": slug})
    _log(f"Internal link refresh queued for {len(slugs)} pages")


def run_flow_optimisation():
    """Full on-site flow optimisation pass (runs every 4 hours)."""
    _log("Starting on-site flow optimisation pass...")
    pages = fetch_page_metrics()
    if not pages:
        _log("No page metrics available — skipping flow pass")
        return

    _log(f"Analysing {len(pages)} pages for flow optimisation")

    # 1. Generate Claude CTAs for top pages
    patches = generate_cta_patches(pages)
    if patches:
        _log(f"Generated {len(patches)} CTA patches")
        apply_cta_patches(patches)
    else:
        _log("No CTA patches generated (Claude unavailable or no pages)")

    # 2. Refresh internal links on high-traffic pages
    trigger_internal_link_refresh(pages)

    _log("Flow optimisation pass complete")


# ── Layer 4: Source routing / winner amplification ────────────────────────────

def analyse_source_mix() -> dict:
    """
    Compares current vs previous 7-day session counts.
    Identifies which channels are under-delivering.
    Returns {channel: delta_pct} for channels that dropped >20%.
    """
    curr = _get("/api/v1/growth/metrics?days=7")
    prev = _get("/api/v1/growth/metrics?days=14")  # 14-day window includes both periods

    if not curr or not prev:
        return {}

    curr_sessions = curr.get("growth", {}).get("sessions", 1)
    prev_sessions = prev.get("growth", {}).get("sessions", 1)

    delta = ((curr_sessions - prev_sessions) / max(prev_sessions, 1)) * 100
    _log(f"Traffic trend: {curr_sessions} sessions (7d) vs {prev_sessions} (14d). Δ={delta:+.1f}%")

    if delta < -20:
        _log(f"⚠️  Overall traffic down {abs(delta):.0f}% — triggering compensation burst", "WARN")
        return {"overall": delta}

    return {}


def amplify_winning_channels(burst_results: dict):
    """
    After a burst, track which channels succeeded.
    Boost their scores so future bursts prioritise them.
    """
    global _channel_scores
    for channel, status in burst_results.items():
        if isinstance(status, str) and "sent" in status or "posted" in status:
            _channel_scores[channel] = _channel_scores.get(channel, 0) + 1.0
        elif isinstance(status, str) and "error" in status:
            _channel_scores[channel] = max(0, _channel_scores.get(channel, 0) - 0.5)

    top = sorted(_channel_scores.items(), key=lambda x: -x[1])[:3]
    _log(f"Top channels by score: {top}")


# ── Main entry points ──────────────────────────────────────────────────────────

def run_monitor_cycle() -> dict:
    """
    Single monitor cycle — called every 15 min by orchestrator.
    Returns summary dict.
    """
    active = fetch_active_users()
    _log(f"Active users (last {MONITOR_WINDOW} min): {active} / goal: {ACTIVE_USER_GOAL}")

    summary = {
        "active_users": active,
        "goal":         ACTIVE_USER_GOAL,
        "burst_fired":  False,
        "below_goal":   active < ACTIVE_USER_GOAL,
    }

    if is_burst_needed(active):
        results = fire_acquisition_burst(active)
        summary["burst_fired"]    = True
        summary["burst_channels"] = results
        amplify_winning_channels(results)
    else:
        deficit = ACTIVE_USER_GOAL - active
        _log(f"No burst needed (active={active}, goal={ACTIVE_USER_GOAL}, deficit={deficit})")

    return summary


def run_flow_cycle():
    """
    Full analysis cycle — called every 4 hours by orchestrator.
    Combines source routing + on-site flow.
    """
    _log("=" * 55)
    _log("TRAFFIC FLOW AGENT — Full analysis cycle")
    _log("=" * 55)

    # Check overall trend first
    gaps = analyse_source_mix()

    # On-site flow optimisation
    run_flow_optimisation()

    # If overall traffic is down, also fire a burst
    if gaps:
        active = fetch_active_users()
        if active < ACTIVE_USER_GOAL:
            fire_acquisition_burst(active)

    _log("Full analysis cycle complete")


def print_status():
    """Print current traffic flow agent status."""
    active = fetch_active_users()
    print("\n" + "=" * 60)
    print("PRICEBASKET.IN — TRAFFIC FLOW AGENT STATUS")
    print("=" * 60)
    print(f"  Active users now:  {active}  (goal: {ACTIVE_USER_GOAL})")
    print(f"  Below goal:        {'YES ⚠️' if active < ACTIVE_USER_GOAL else 'NO ✅'}")
    print(f"  Last burst:        {_last_burst_at.strftime('%H:%M:%S') if _last_burst_at else 'never'}")
    print(f"  Burst cooldown:    {BURST_COOLDOWN_MIN} min")
    print(f"  Total bursts:      {len(_burst_history)}")
    print(f"\n  Channel scores (cumulative):")
    for ch, score in sorted(_channel_scores.items(), key=lambda x: -x[1]):
        bar = "█" * int(score) if score > 0 else "·"
        print(f"    {ch:<12} {bar} ({score:.1f})")
    if _burst_history:
        last = _burst_history[-1]
        print(f"\n  Last burst result: {json.dumps(last.get('channels', {}), indent=4)}")
    print("=" * 60)


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="PriceBasket Traffic Flow Agent — drives active users to 100+"
    )
    parser.add_argument("--dry-run",  action="store_true", help="Log actions without making API calls")
    parser.add_argument("--verbose",  action="store_true", help="Show debug logs")
    parser.add_argument("--once",     action="store_true", help="Run one monitor cycle and exit")
    parser.add_argument("--flow",     action="store_true", help="Run one full flow-analysis cycle and exit")
    parser.add_run_now = parser.add_argument("--burst-now", action="store_true",
                                              help="Fire acquisition burst immediately regardless of active count")
    parser.add_argument("--status",   action="store_true", help="Show status and exit")
    parser.add_argument("--daemon",   action="store_true", help="Run monitor loop every 15 min until Ctrl+C")
    args = parser.parse_args()

    if args.dry_run:
        DRY_RUN = True
    if args.verbose:
        VERBOSE = True

    if args.status:
        print_status()
        sys.exit(0)

    if args.burst_now:
        active = fetch_active_users()
        _log(f"Forcing burst (active={active})")
        results = fire_acquisition_burst(active)
        _log(f"Burst results: {json.dumps(results, indent=2)}")
        sys.exit(0)

    if args.once:
        summary = run_monitor_cycle()
        print_status()
        sys.exit(0)

    if args.flow:
        run_flow_cycle()
        print_status()
        sys.exit(0)

    if args.daemon:
        import schedule as sched
        _log(f"Daemon starting. Monitor every 15 min. Flow analysis every 4 h.")
        _log(f"Goal: {ACTIVE_USER_GOAL} active users. Backend: {BACKEND_API}")

        sched.every(15).minutes.do(run_monitor_cycle)
        sched.every(4).hours.do(run_flow_cycle)

        # Run immediately on start
        run_monitor_cycle()

        try:
            while True:
                sched.run_pending()
                time.sleep(30)
        except KeyboardInterrupt:
            print_status()
        sys.exit(0)

    # Default: one monitor cycle
    summary = run_monitor_cycle()
    _log(f"Result: {json.dumps(summary)}")
