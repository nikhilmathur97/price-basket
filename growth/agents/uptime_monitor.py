#!/usr/bin/env python3
"""
PRICEBASKET.IN — Uptime + Backend-Warmer Monitor
=================================================
A legitimate site-health agent. It does three useful things:

  1. KEEPS THE BACKEND WARM — pings the Render /health endpoint on an interval
     so the free-tier dyno doesn't sleep (cold starts cause slow first loads
     that hurt SEO + bounce rate, and break the first user's experience).
  2. MONITORS UPTIME — checks the homepage and key SEO pages, records status
     codes + response times, and computes a rolling uptime %.
  3. ALERTS ON DOWNTIME — prints a clear console alert and (optionally) posts
     to a Slack/Discord/Telegram webhook when something goes down or recovers.

This is NOT a traffic bot. It does not execute page JavaScript, so it does not
register as a Google Analytics "user" — and that's deliberate. Inflating your
own analytics with fake hits pollutes the exact metric you want to grow and can
get the site penalised. To see REAL users: Google Analytics → Realtime, and
Google Search Console → Performance (clicks/impressions from Google).

Usage:
    # keep-warm mode (default) — pings every 10 min, gentle, runs forever
    python uptime_monitor.py

    # active monitoring — check every 60s
    python uptime_monitor.py --interval 60

    # one-shot check (e.g. from cron / CI) then exit
    python uptime_monitor.py --once

    # custom alert webhook (Slack/Discord incoming-webhook URL)
    ALERT_WEBHOOK_URL="https://hooks.slack.com/..." python uptime_monitor.py

Stdlib only — no pip install required. Python 3.8+.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────────────────────
SITE_URL = os.getenv("MONITOR_SITE_URL", "https://pricebasket.in")
BACKEND_URL = os.getenv("MONITOR_BACKEND_URL", "https://pricebasket-api.onrender.com")
ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")  # optional Slack/Discord/Telegram

# Pages to monitor (kept small + high-value so we don't hammer the site).
# The backend /health ping is what keeps Render warm.
MONITORED_TARGETS = [
    ("homepage",        f"{SITE_URL}/"),
    ("search",          f"{SITE_URL}/search"),
    ("deals-blinkit",   f"{SITE_URL}/deals/blinkit"),
    ("price-page",      f"{SITE_URL}/price/mumbai/milk"),
    ("backend-health",  f"{BACKEND_URL}/health"),
]

DEFAULT_KEEPWARM_INTERVAL = 600   # 10 min — enough to keep Render (15-min sleep) awake
REQUEST_TIMEOUT = 30              # seconds; Render cold start can be slow
USER_AGENT = "PriceBasket-UptimeMonitor/1.0 (+https://pricebasket.in)"

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uptime_log.json")

# ── State ───────────────────────────────────────────────────────────────────
# per-target rolling stats: checks, failures, last_status ("up"/"down")
_stats: dict[str, dict] = {}
_running = True


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _check(url: str) -> tuple[bool, int, float, str]:
    """Return (ok, status_code, elapsed_ms, error)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="GET")
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            elapsed = (time.monotonic() - start) * 1000
            code = resp.getcode()
            return (200 <= code < 400, code, elapsed, "")
    except urllib.error.HTTPError as e:
        elapsed = (time.monotonic() - start) * 1000
        return (False, e.code, elapsed, f"HTTP {e.code}")
    except Exception as e:  # noqa: BLE001 — any network error = down
        elapsed = (time.monotonic() - start) * 1000
        return (False, 0, elapsed, str(e))


def _send_alert(message: str) -> None:
    """Post an alert to a webhook if configured; always print to console."""
    print(f"  🔔 ALERT: {message}", flush=True)
    if not ALERT_WEBHOOK_URL:
        return
    try:
        # Slack/Discord both accept a JSON body; Slack uses {"text"}, Discord {"content"}.
        # Sending both keys is harmless — each platform reads the one it knows.
        payload = json.dumps({"text": message, "content": message}).encode("utf-8")
        req = urllib.request.Request(
            ALERT_WEBHOOK_URL,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=15).read()
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️  Failed to send webhook alert: {e}", flush=True)


def _append_log(entry: dict) -> None:
    """Append one round's results to the JSON log (best-effort, keeps last 500)."""
    try:
        log = []
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r") as f:
                log = json.load(f)
        log.append(entry)
        log = log[-500:]
        with open(LOG_FILE, "w") as f:
            json.dump(log, f, indent=2)
    except Exception as e:  # noqa: BLE001 — logging must never crash the monitor
        print(f"  ⚠️  Log write failed: {e}", flush=True)


def run_round() -> dict:
    """Check every target once, update stats, fire alerts on state change."""
    ts = _now()
    print(f"\n[{ts}] Checking {len(MONITORED_TARGETS)} targets…", flush=True)
    results = []

    for name, url in MONITORED_TARGETS:
        ok, code, ms, err = _check(url)

        st = _stats.setdefault(name, {"checks": 0, "failures": 0, "last_status": None})
        st["checks"] += 1
        if not ok:
            st["failures"] += 1

        prev = st["last_status"]
        now_status = "up" if ok else "down"

        # Alert only on a state CHANGE (down→up or up→down), not every round.
        if prev is not None and prev != now_status:
            if now_status == "down":
                _send_alert(f"🔴 {name} DOWN — {url} ({err or f'HTTP {code}'})")
            else:
                _send_alert(f"🟢 {name} RECOVERED — {url} (HTTP {code}, {ms:.0f}ms)")
        st["last_status"] = now_status

        uptime_pct = 100 * (st["checks"] - st["failures"]) / st["checks"]
        icon = "✅" if ok else "❌"
        warm = " 🔥 (backend kept warm)" if ok and name == "backend-health" else ""
        print(
            f"  {icon} {name:<16} HTTP {code or '---':<3} {ms:6.0f}ms  "
            f"uptime {uptime_pct:5.1f}%{warm}",
            flush=True,
        )
        results.append(
            {"name": name, "url": url, "ok": ok, "status": code,
             "ms": round(ms, 1), "error": err, "uptime_pct": round(uptime_pct, 2)}
        )

    entry = {"checked_at": ts, "results": results}
    _append_log(entry)
    return entry


def _handle_sigterm(signum, frame):  # noqa: ARG001
    global _running
    _running = False
    print("\n👋 Shutting down monitor…", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="PriceBasket uptime + backend-warmer monitor")
    parser.add_argument("--interval", type=int, default=DEFAULT_KEEPWARM_INTERVAL,
                        help=f"seconds between rounds (default {DEFAULT_KEEPWARM_INTERVAL} = keep-warm)")
    parser.add_argument("--once", action="store_true", help="run a single round and exit")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, _handle_sigterm)
    signal.signal(signal.SIGTERM, _handle_sigterm)

    print("═" * 60)
    print("  PriceBasket Uptime + Backend-Warmer Monitor")
    print(f"  Site:    {SITE_URL}")
    print(f"  Backend: {BACKEND_URL}")
    print(f"  Alerts:  {'webhook configured' if ALERT_WEBHOOK_URL else 'console only'}")
    print(f"  Mode:    {'single check' if args.once else f'every {args.interval}s'}")
    print("═" * 60)

    if args.once:
        run_round()
        return 0

    while _running:
        run_round()
        # Sleep in 1s slices so Ctrl-C / SIGTERM responds promptly.
        for _ in range(args.interval):
            if not _running:
                break
            time.sleep(1)

    return 0


if __name__ == "__main__":
    sys.exit(main())
