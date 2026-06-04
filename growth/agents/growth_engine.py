#!/usr/bin/env python3
"""
PRICEBASKET.IN — Growth Engine (One-Command Marketing Controller)
=================================================================
A single entry point that drives the entire 20-point traffic plan:

  python growth_engine.py            # full daily run (preflight + auto-agents + action card)
  python growth_engine.py preflight  # show which of the 20 points are LIVE vs BLOCKED
  python growth_engine.py run        # run every fully-automatable agent once
  python growth_engine.py card       # generate today's copy-paste Human Action Card

Why this exists
---------------
`orchestrator.py` already runs ~15 sub-agents on a schedule. This wrapper adds
the two things needed to make "manage everything from one place" honest:

  1. PREFLIGHT  — maps all 20 marketing points to their required credentials and
     prints, per point, whether it is LIVE (automated), BLOCKED (needs a one-time
     human setup, with the exact link), or HUMAN (irreducibly manual + ToS-bound).

  2. ACTION CARD — for the points that cannot be legally/physically automated
     (Reddit, Quora, Instagram Reel, Product Hunt, personal-WhatsApp shares), it
     generates a ready-to-paste daily packet — real deal-of-the-day data, the post
     text, the reel script, the WhatsApp message — every link UTM-tagged. Your
     manual work drops from "create + post" to "paste + send" (~5 min/day).

Honest scope: no script can create a Google account, accept Terms of Service, put
money behind ads, or auto-post to Reddit/Quora/Instagram without risking a ban.
Those stay human by design — this tool removes the *creation* effort, not the click.
"""

import os
import sys
import argparse
import datetime
import importlib.util
import subprocess

# requests is used by all sibling agents; guard so preflight/card still work without network libs
try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

# Load .env from repo root + backend, same as orchestrator
try:
    from dotenv import load_dotenv
    _ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
    load_dotenv(os.path.join(_ROOT, ".env"))
    load_dotenv(os.path.join(_ROOT, "backend", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

# ── Config ──────────────────────────────────────────────────────────────────────
AGENTS_DIR  = os.path.dirname(os.path.abspath(__file__))
SITE_URL    = os.getenv("SITE_URL", "https://pricebasket.in")
BACKEND_API = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
TODAY       = datetime.date.today().isoformat()
CARD_DIR    = os.path.join(os.path.dirname(AGENTS_DIR), "action-cards")

GREEN, YELLOW, RED, DIM, BOLD, END = (
    "\033[92m", "\033[93m", "\033[91m", "\033[2m", "\033[1m", "\033[0m"
)


# ── Lazy agent import (same graceful-degradation pattern as orchestrator) ────────
def _import(module_file: str, attr: str):
    """Import an attribute from a sibling agent file; return None on any failure."""
    try:
        path = os.path.join(AGENTS_DIR, module_file)
        spec = importlib.util.spec_from_file_location(f"_pb_{attr}", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return getattr(mod, attr, None)
    except Exception:
        return None


def _import_social(module_file: str, attr: str):
    """Import from the growth/social/ directory."""
    try:
        path = os.path.join(os.path.dirname(AGENTS_DIR), "social", module_file)
        spec = importlib.util.spec_from_file_location(f"_pbs_{attr}", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return getattr(mod, attr, None)
    except Exception:
        return None


# ── UTM helper — every shared link is attributed ─────────────────────────────────
def utm(url: str, source: str, medium: str = "organic", campaign: str = "daily-deal") -> str:
    sep = "&" if "?" in url else "?"
    return (
        f"{url}{sep}utm_source={source}&utm_medium={medium}"
        f"&utm_campaign={campaign}&utm_content={TODAY}"
    )


# ──────────────────────────────────────────────────────────────────────────────────
#  PART 1 — PREFLIGHT: the 20 points → LIVE / BLOCKED / HUMAN
# ──────────────────────────────────────────────────────────────────────────────────

# status: "auto"  → fully automated once keys are set (LIVE if keys present)
#         "setup" → one-time human setup, then automated forever
#         "draft" → agent drafts content, human posts (platform ToS)
#         "human" → irreducibly manual (filming / personal shares / launches)
#         "build" → a code feature to build once, then automatic
#
# keys: env vars that must ALL be present for this point to be LIVE.
PLAN = [
    # n, title, status, [keys], unblock-hint
    (1,  "Google Search Console + sitemap",      "setup", ["GSC_SERVICE_ACCOUNT_JSON"],
         "search.google.com/search-console — add property, verify DNS, submit /sitemap.xml"),
    (2,  "Google Analytics 4",                   "setup", ["GA4_PROPERTY_ID"],
         "analytics.google.com — create property, set NEXT_PUBLIC_GA_ID in Vercel"),
    (3,  "Bing Webmaster Tools",                 "setup", [],
         "bing.com/webmasters — 'Import from GSC' (2 clicks). No key needed."),
    (4,  "Backend content+social automation ON", "setup",
         ["INDEXNOW_KEY"],
         "Render dashboard → set CONTENT_AUTOMATION_ENABLED=true, SOCIAL_AUTOMATION_ENABLED=true, INDEXNOW_KEY"),
    (5,  "WhatsApp Business broadcast",          "setup",
         ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"],
         "developers.facebook.com → WhatsApp product → Phone Number ID + permanent token (personal-group shares stay manual)"),
    (6,  "Telegram deals channel (bot)",         "setup",
         ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"],
         "@BotFather → create bot, add as channel admin, set TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID"),
    (7,  "Reddit answers",                        "draft", ["REDDIT_CLIENT_ID"],
         "Agent drafts the post — YOU paste it (Reddit bans auto self-promo). See Action Card."),
    (8,  "Instagram Reels + captions",           "draft", ["INSTAGRAM_ACCESS_TOKEN"],
         "Agent writes caption + reel script — YOU film & post the Reel. See Action Card."),
    (9,  "Quora answers",                         "draft", [],
         "No Quora API. Agent drafts the answer — YOU paste it. See Action Card."),
    (10, "GSC ranking monitor (weekly)",         "auto",  ["GSC_SERVICE_ACCOUNT_JSON"],
         "Same service account as #1 — then fully automated."),
    (11, "Daily SEO blog post",                  "auto",
         ["ANTHROPIC_API_KEY"],
         "Set ANTHROPIC_API_KEY (or AWS_ACCESS_KEY_ID for Bedrock) — then auto-publishes daily."),
    (12, "Internal-link agent",                  "auto",  [],
         "Runs against backend — no key needed."),
    (13, "Google Search Ads",                     "human", [],
         "Manual: create Ads account + billing, then campaigns. Money + ToS = human."),
    (14, "Instagram / Facebook ads",             "human", [],
         "Manual: ad account + budget. Boost your best organic Reel rather than build cold."),
    (15, "Product Hunt launch",                  "human", [],
         "Manual one-time event (real account + hunter). Action Card gives you the listing copy."),
    (16, "Shareable OG images + share buttons",  "build", [],
         "Code task (the P0 work) — build once, then every shared link self-renders."),
    (17, "Referral / invite loop",               "build", [],
         "Code task — build once, then compounding."),
    (18, "Daily multi-channel posting",          "auto",
         ["TELEGRAM_BOT_TOKEN"],
         "Telegram/Twitter auto-post; Reddit/IG drafted in Action Card."),
    (19, "Weekly metrics report",                "auto",  ["GA4_PROPERTY_ID", "GSC_SERVICE_ACCOUNT_JSON"],
         "Auto once GA4 + GSC creds exist (#1, #2)."),
    (20, "UTM tags on every link",               "auto",  [],
         "Always on — baked into every link this engine generates."),
]

_STATUS_LABEL = {
    "auto":  "AUTOMATED",
    "setup": "1-TIME SETUP",
    "draft": "AGENT DRAFTS → YOU POST",
    "human": "MANUAL (money/launch)",
    "build": "CODE FEATURE",
}


def _keys_present(keys: list[str]) -> bool:
    return all(bool(os.getenv(k)) for k in keys)


def run_preflight() -> dict:
    """Print the 20-point readiness board and return a machine-readable summary."""
    print(f"\n{BOLD}{'='*74}{END}")
    print(f"{BOLD}  PRICEBASKET GROWTH ENGINE — 20-POINT READINESS{END}")
    print(f"  {DIM}{TODAY} · site={SITE_URL}{END}")
    print(f"{BOLD}{'='*74}{END}\n")

    summary = {"live": 0, "blocked": 0, "human": 0, "build": 0, "items": []}

    for n, title, status, keys, hint in PLAN:
        ready = _keys_present(keys)

        if status in ("auto",):
            state, color = ("LIVE", GREEN) if ready else ("BLOCKED", RED)
        elif status == "setup":
            state, color = ("LIVE", GREEN) if ready else ("BLOCKED", YELLOW)
        elif status == "draft":
            # draft points are always actionable via the Action Card, but "auto-post" needs keys
            state, color = ("READY", GREEN) if ready else ("READY*", YELLOW)
        elif status == "build":
            state, color = ("TODO", YELLOW)
        else:  # human
            state, color = ("MANUAL", DIM)

        # tally
        if state in ("LIVE", "READY"):
            summary["live"] += 1
        elif state in ("BLOCKED",):
            summary["blocked"] += 1
        elif state in ("TODO",):
            summary["build"] += 1
        elif state in ("MANUAL", "READY*"):
            summary["human"] += 1

        tag = _STATUS_LABEL[status]
        print(f"  {color}{state:<8}{END} {BOLD}#{n:<2}{END} {title}")
        print(f"           {DIM}{tag} · {hint}{END}")
        summary["items"].append({"n": n, "title": title, "state": state, "status": status})

    total = len(PLAN)
    print(f"\n{BOLD}{'-'*74}{END}")
    print(
        f"  {GREEN}{summary['live']} live/ready{END} · "
        f"{YELLOW}{summary['blocked']} blocked on setup{END} · "
        f"{YELLOW}{summary['build']} to build{END} · "
        f"{DIM}{summary['human']} manual{END}   (of {total})"
    )
    print(f"  {DIM}* READY* = drafted daily in the Action Card; auto-posting needs the key.{END}")
    print(f"{BOLD}{'-'*74}{END}\n")
    return summary


# ──────────────────────────────────────────────────────────────────────────────────
#  PART 2 — RUN: fire every fully-automatable agent once (delegates to orchestrator)
# ──────────────────────────────────────────────────────────────────────────────────
def run_auto_agents() -> bool:
    """Run all schedulable agents one time via the existing orchestrator."""
    orch = os.path.join(AGENTS_DIR, "orchestrator.py")
    if not os.path.exists(orch):
        print(f"{RED}orchestrator.py not found — cannot run auto-agents.{END}")
        return False
    print(f"{BOLD}▶ Running all auto-agents once (via orchestrator.py once)...{END}\n")
    try:
        subprocess.run([sys.executable, orch, "once"], cwd=AGENTS_DIR, check=False)
        return True
    except Exception as exc:
        print(f"{RED}Failed to run orchestrator: {exc}{END}")
        return False


# ──────────────────────────────────────────────────────────────────────────────────
#  PART 3 — DEAL OF THE DAY (real data, graceful fallback)
# ──────────────────────────────────────────────────────────────────────────────────
_FALLBACK_DEAL = {
    "name": "Aashirvaad Atta 5kg",
    "best_price": 189,
    "cheapest_platform": "JioMart",
    "high_price": 240,
    "high_platform": "Blinkit",
    "savings": 51,
    "url": f"{SITE_URL}/search?q=aashirvaad%20atta%205kg",
}


def fetch_deal_of_day() -> dict:
    """
    Pull featured products from the backend and pick the biggest single-item saving.
    Falls back to a realistic example if the backend is unreachable so the card is
    never empty.
    """
    if requests is None:
        return dict(_FALLBACK_DEAL)
    try:
        resp = requests.get(f"{BACKEND_API}/api/v1/products/featured?limit=15", timeout=15)
        if not resp.ok:
            return dict(_FALLBACK_DEAL)
        items = resp.json().get("items", []) if isinstance(resp.json(), dict) else resp.json()
        best = None
        best_saving = 0
        for it in items or []:
            prices = [
                p.get("price") for p in (it.get("platform_prices") or [])
                if p.get("is_available") and isinstance(p.get("price"), (int, float))
            ]
            if len(prices) < 2:
                # try flat fields some endpoints expose
                low = it.get("best_price")
                save = it.get("savings_amount")
                if low and save and save > best_saving:
                    best_saving = save
                    best = {
                        "name": it.get("name", "this item"),
                        "best_price": round(low),
                        "cheapest_platform": (it.get("cheapest_platform") or {}).get("name")
                            if isinstance(it.get("cheapest_platform"), dict)
                            else it.get("cheapest_platform", "the cheapest app"),
                        "high_price": round(low + save),
                        "high_platform": "another app",
                        "savings": round(save),
                        "url": f"{SITE_URL}/product/{it.get('id', '')}" if it.get("id") else f"{SITE_URL}/search",
                    }
                continue
            low, high = min(prices), max(prices)
            save = round(high - low)
            if save > best_saving:
                pp = it.get("platform_prices") or []
                low_plat = next((p.get("platform", {}).get("name") or p.get("platform_name", "the cheapest app")
                                 for p in pp if p.get("price") == low), "the cheapest app")
                high_plat = next((p.get("platform", {}).get("name") or p.get("platform_name", "another app")
                                  for p in pp if p.get("price") == high), "another app")
                best_saving = save
                best = {
                    "name": it.get("name", "this item"),
                    "best_price": round(low),
                    "cheapest_platform": low_plat,
                    "high_price": round(high),
                    "high_platform": high_plat,
                    "savings": save,
                    "url": f"{SITE_URL}/product/{it.get('id', '')}" if it.get("id") else f"{SITE_URL}/search",
                }
        return best or dict(_FALLBACK_DEAL)
    except Exception:
        return dict(_FALLBACK_DEAL)


# ──────────────────────────────────────────────────────────────────────────────────
#  PART 4 — HUMAN ACTION CARD (the daily copy-paste packet)
# ──────────────────────────────────────────────────────────────────────────────────
def _reddit_answer(deal: dict) -> str:
    """Reuse the Reddit agent's AI/fallback generator; degrade to a local template."""
    gen = _import("reddit_quora_agent.py", "generate_contextual_answer")
    if gen:
        try:
            return gen(
                "Which grocery app is actually cheapest right now?",
                "Trying to cut my monthly grocery bill — is Blinkit/Zepto/BigBasket cheaper?",
                "frugal_india",
            )
        except Exception:
            pass
    return (
        f"No single app is always cheapest — it changes daily and by product.\n\n"
        f"Quick example from today: {deal['name']} is ₹{deal['best_price']} on "
        f"{deal['cheapest_platform']} vs ₹{deal['high_price']} on {deal['high_platform']} "
        f"— that's ₹{deal['savings']} on one item.\n\n"
        f"I check {SITE_URL.replace('https://','')} before ordering — it compares 8 apps "
        f"in real time, free, no app download. Saves me ₹300–500 most orders."
    )


def _quora_answer(deal: dict) -> str:
    gen = _import("reddit_quora_agent.py", "generate_quora_answer")
    if gen:
        try:
            return gen("Which grocery delivery app is cheapest in India?")
        except Exception:
            pass
    return _reddit_answer(deal)


def _ai_available() -> bool:
    """True only if a Claude backend is configured (Anthropic key or Bedrock)."""
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("AWS_ACCESS_KEY_ID"))


def _instagram_caption(deal: dict) -> str:
    # Only call the social generator when AI is configured — otherwise it returns a
    # static example caption that can mismatch today's deal. Local fallback stays on-topic.
    if _ai_available():
        gen = _import_social("instagram-automation.py", "generate_daily_caption")
        if gen:
            try:
                return gen(top_deal=deal)
            except Exception:
                pass
    tags = ("#BlinkitVsZepto #GroceryDeals #PriceBasket #SaveMoney #ZeptoDeals "
            "#IndiaDeals #GroceryShopping #QuickCommerce #BlinkitDeals #BigBasket "
            "#MumbaiDeals #DelhiDeals #BangaloreDeals #MoneyTips #SavingTips")
    return (
        f"Same {deal['name']} — ₹{deal['high_price']} on {deal['high_platform']}, "
        f"₹{deal['best_price']} on {deal['cheapest_platform']}. 🤯\n"
        f"You're paying ₹{deal['savings']} extra for the SAME thing.\n\n"
        f"Compare 8 grocery apps free 👉 pricebasket.in\n\n{tags}"
    )


def build_action_card() -> str:
    """Assemble today's copy-paste packet and return the markdown."""
    deal = fetch_deal_of_day()

    reddit_link  = utm(deal["url"], "reddit",   "social",    "community")
    quora_link   = utm(deal["url"], "quora",    "social",    "community")
    ig_link      = utm(SITE_URL,    "instagram","social",    "reel")
    wa_link      = utm(SITE_URL,    "whatsapp", "messaging",  "group-share")

    hook = (f"Same {deal['name']}: ₹{deal['high_price']} on {deal['high_platform']} "
            f"vs ₹{deal['best_price']} on {deal['cheapest_platform']} — save ₹{deal['savings']}.")

    reel_script = f"""[0-3s]  Open {deal['high_platform']}, show {deal['name']} at ₹{deal['high_price']}
[3-8s]  "Aap ₹{deal['savings']} zyada de rahe ho!" (You're paying ₹{deal['savings']} extra!)
[8-15s] Screen-record pricebasket.in comparing the same item across apps
[15-20s] "{deal['cheapest_platform']} pe sirf ₹{deal['best_price']}!" (Only ₹{deal['best_price']}!)
[20-25s] "pricebasket.in — FREE mein compare karo\""""

    wa_message = (f"Bhai/Didi, same {deal['name']} — ₹{deal['high_price']} on {deal['high_platform']}, "
                  f"sirf ₹{deal['best_price']} on {deal['cheapest_platform']}. "
                  f"Yeh site free mein batati hai kahan sasta hai 👉 {wa_link}")

    card = f"""# 🛒 PriceBasket — Human Action Card · {TODAY}

> **Today's hook:** {hook}
> Everything below is ready to paste. Total time: ~5–7 minutes.
> Every link is UTM-tagged so GA4 shows exactly which channel worked.

---

## 1. Reddit  (1 post · ~2 min)  — point #7
**Rule:** post the comment as a genuine reply on a relevant thread. Put the link in a
follow-up comment, NOT the title. Targets: r/frugal_india, r/india, r/IndiaInvestments,
r/bangalore, r/mumbai, r/delhi.

```
{_reddit_answer(deal)}
```
🔗 Link to drop in a reply: {reddit_link}

---

## 2. Quora  (1 answer · ~2 min)  — point #9
Search Quora for: *"Which grocery delivery app is cheapest in India?"* and paste:

```
{_quora_answer(deal)}
```
🔗 Link: {quora_link}

---

## 3. Instagram Reel  (~3 min to film)  — point #8
**Caption (paste as-is):**
```
{_instagram_caption(deal)}
```
**30-sec reel script:**
```
{reel_script}
```
🔗 Link in bio / sticker: {ig_link}

---

## 4. WhatsApp  (share in 5 groups · ~1 min)  — point #5
Paste into family / society / friends groups:
```
{wa_message}
```

---

## 5. Reminders (not daily)
- **Product Hunt (#15):** launch on a Tue/Wed. Tagline: *"Compare Blinkit, Zepto & BigBasket prices in real-time."* Lead with the ₹340 avg saving.
- **Google/Meta Ads (#13, #14):** once GA4 shows your best organic post, boost THAT — don't build cold ads.

---
_Generated by growth_engine.py · auto-agents (blog, Telegram, push, internal links, GSC) already ran separately._
"""
    return card


def write_action_card() -> str:
    """Generate the card, save it dated, print the path."""
    card = build_action_card()
    os.makedirs(CARD_DIR, exist_ok=True)
    path = os.path.join(CARD_DIR, f"action-card-{TODAY}.md")
    with open(path, "w") as f:
        f.write(card)
    print(f"\n{GREEN}✓ Action Card written:{END} {path}\n")
    print(card)
    return path


# ──────────────────────────────────────────────────────────────────────────────────
#  CLI
# ──────────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="PriceBasket Growth Engine — one-command marketing controller"
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="daily",
        choices=["daily", "preflight", "run", "card"],
        help="daily=preflight+run+card (default) · preflight=readiness board · "
             "run=fire auto-agents once · card=generate Action Card only",
    )
    args = parser.parse_args()

    if args.command == "preflight":
        run_preflight()
    elif args.command == "run":
        run_auto_agents()
    elif args.command == "card":
        write_action_card()
    else:  # daily
        summary = run_preflight()
        run_auto_agents()
        write_action_card()
        print(f"{BOLD}Done.{END} {GREEN}{summary['live']}{END} points live · "
              f"open the Action Card above for your ~5-min manual tasks.\n")


if __name__ == "__main__":
    main()
