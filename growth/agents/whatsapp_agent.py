#!/usr/bin/env python3
"""
PRICEBASKET.IN — WhatsApp Price Alert Agent
============================================
Sends price-drop notifications to opted-in subscribers via WhatsApp Business
Cloud API (Meta). Reads subscriber list from the PriceBasket backend API and
fires templated messages when a tracked product drops below a user's target.

Safe limits:
  • Only sends to users who explicitly opted in (GDPR/TRAI compliant)
  • Max 1 message per user per product per 24 hours (dedup via Redis-style dict)
  • Uses approved message templates — no free-form spam
  • Rate: ~80 messages/min to stay well under Meta's 1,000/min limit

Setup:
  pip install requests schedule
  Set env vars:
    WHATSAPP_PHONE_NUMBER_ID   — from Meta Business > WhatsApp > API Setup
    WHATSAPP_ACCESS_TOKEN      — permanent system-user token
    BACKEND_API_URL            — https://pricebasket-api.onrender.com
    WHATSAPP_TEMPLATE_NAME     — approved template name (default: price_drop_alert)
    WHATSAPP_TEMPLATE_LANG     — template language code (default: en)
"""

import os
import time
import datetime
import schedule
import requests

# ── Config ────────────────────────────────────────────────────────────────────
WA_PHONE_ID   = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WA_TOKEN      = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
BACKEND_API   = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
TEMPLATE_NAME = os.getenv("WHATSAPP_TEMPLATE_NAME", "price_drop_alert")
TEMPLATE_LANG = os.getenv("WHATSAPP_TEMPLATE_LANG", "en")
WA_API_URL    = f"https://graph.facebook.com/v18.0/{WA_PHONE_ID}/messages"

# In-memory dedup: {phone_product_key: date_str}
_sent_today: dict[str, str] = {}


# ── WhatsApp API helpers ──────────────────────────────────────────────────────

def _headers() -> dict:
    return {
        "Authorization": f"Bearer {WA_TOKEN}",
        "Content-Type": "application/json",
    }


def send_template_message(
    phone: str,
    product_name: str,
    platform: str,
    new_price: float,
    old_price: float,
    product_url: str,
) -> dict:
    """
    Send an approved WhatsApp template message.

    Template variables (positional):
      {{1}} product_name
      {{2}} platform
      {{3}} new_price (₹)
      {{4}} old_price (₹)
      {{5}} savings   (₹)
      {{6}} product_url

    Example approved template body:
      "🚨 Price Drop! {{1}} is now ₹{{3}} on {{2}} (was ₹{{4}}).
       You save ₹{{5}}! 👉 {{6}}"
    """
    if not WA_PHONE_ID or not WA_TOKEN:
        savings = round(old_price - new_price)
        print(
            f"[DRY RUN] WhatsApp → {phone}: {product_name} ₹{int(new_price)} "
            f"on {platform} (save ₹{savings}) → {product_url}"
        )
        return {"status": "dry_run"}

    savings = round(old_price - new_price)
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": TEMPLATE_NAME,
            "language": {"code": TEMPLATE_LANG},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": product_name},
                        {"type": "text", "text": platform},
                        {"type": "text", "text": str(int(new_price))},
                        {"type": "text", "text": str(int(old_price))},
                        {"type": "text", "text": str(savings)},
                        {"type": "text", "text": product_url},
                    ],
                }
            ],
        },
    }
    try:
        resp = requests.post(WA_API_URL, headers=_headers(), json=payload, timeout=10)
        result = resp.json()
        if resp.status_code == 200:
            print(f"[{_now()}] ✅ WhatsApp sent to {phone[-4:]}**** — {product_name}")
        else:
            print(f"[{_now()}] ❌ WhatsApp failed for {phone[-4:]}****: {result}")
        return result
    except Exception as exc:
        print(f"[{_now()}] WhatsApp error: {exc}")
        return {"status": "error", "error": str(exc)}


def send_weekly_deals_broadcast(phone: str, deals: list[dict]) -> dict:
    """
    Send weekly top-5 deals digest via WhatsApp.
    Uses a separate approved template: weekly_deals_digest
    """
    if not WA_PHONE_ID or not WA_TOKEN:
        print(f"[DRY RUN] Weekly digest → {phone}: {len(deals)} deals")
        return {"status": "dry_run"}

    # Build a compact deals text (fits in template variable)
    lines = []
    for i, d in enumerate(deals[:5], 1):
        lines.append(
            f"{i}. {d.get('name','?')} — ₹{int(d.get('best_price',0))} "
            f"on {d.get('cheapest_platform','?')} "
            f"(save ₹{int(d.get('savings_amount',0))})"
        )
    deals_text = "\n".join(lines)

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": "weekly_deals_digest",
            "language": {"code": TEMPLATE_LANG},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": deals_text},
                        {"type": "text", "text": "https://pricebasket.in/best-grocery-deals"},
                    ],
                }
            ],
        },
    }
    try:
        resp = requests.post(WA_API_URL, headers=_headers(), json=payload, timeout=10)
        return resp.json()
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


# ── Fetch subscribers + triggered alerts from backend ─────────────────────────

def fetch_triggered_alerts() -> list[dict]:
    """
    GET /api/v1/growth/whatsapp-alerts
    Returns list of:
      { user_phone, product_name, platform, new_price, old_price,
        target_price, product_url }
    """
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/growth/whatsapp-alerts",
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("alerts", [])
    except Exception as exc:
        print(f"[{_now()}] fetch_triggered_alerts error: {exc}")
    return []


def fetch_weekly_subscribers() -> list[dict]:
    """
    GET /api/v1/growth/whatsapp-subscribers?type=weekly
    Returns list of { phone, name }
    """
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/growth/whatsapp-subscribers?type=weekly",
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("subscribers", [])
    except Exception as exc:
        print(f"[{_now()}] fetch_weekly_subscribers error: {exc}")
    return []


def fetch_top_deals() -> list[dict]:
    """Fetch top 5 deals from backend for weekly digest."""
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/products/featured?limit=5",
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("items", [])
    except Exception as exc:
        print(f"[{_now()}] fetch_top_deals error: {exc}")
    return []


# ── Main runners ──────────────────────────────────────────────────────────────

def run_price_alert_notifications():
    """
    Runs every 30 minutes.
    Fetches triggered price alerts and sends WhatsApp messages.
    Deduplicates: max 1 message per (phone, product) per day.
    """
    today = datetime.date.today().isoformat()
    alerts = fetch_triggered_alerts()
    sent = 0
    skipped = 0

    for alert in alerts:
        phone   = alert.get("user_phone", "")
        product = alert.get("product_name", "")
        if not phone or not product:
            continue

        dedup_key = f"{phone}::{product}::{today}"
        if dedup_key in _sent_today:
            skipped += 1
            continue

        result = send_template_message(
            phone=phone,
            product_name=product,
            platform=alert.get("platform", ""),
            new_price=alert.get("new_price", 0),
            old_price=alert.get("old_price", 0),
            product_url=alert.get("product_url", "https://pricebasket.in"),
        )
        _sent_today[dedup_key] = today
        sent += 1
        time.sleep(0.75)  # ~80 messages/min — safe rate

    print(f"[{_now()}] WhatsApp alerts: {sent} sent, {skipped} skipped (dedup)")

    # Clean up old dedup keys (keep only today's)
    for key in list(_sent_today.keys()):
        if not key.endswith(today):
            del _sent_today[key]


def run_weekly_digest():
    """
    Runs every Monday at 9am IST.
    Sends top-5 deals digest to all weekly subscribers.
    """
    subscribers = fetch_weekly_subscribers()
    deals = fetch_top_deals()
    if not deals:
        print(f"[{_now()}] Weekly digest: no deals found, skipping")
        return

    sent = 0
    for sub in subscribers:
        phone = sub.get("phone", "")
        if not phone:
            continue
        send_weekly_deals_broadcast(phone, deals)
        sent += 1
        time.sleep(0.75)

    print(f"[{_now()}] Weekly digest sent to {sent} subscribers")


# ── Opt-in message (send when user signs up for WhatsApp alerts) ──────────────

def send_optin_confirmation(phone: str, name: str) -> dict:
    """
    Send opt-in confirmation when a user subscribes to WhatsApp alerts.
    Uses template: whatsapp_optin_confirm
    """
    if not WA_PHONE_ID or not WA_TOKEN:
        print(f"[DRY RUN] Opt-in confirmation → {phone} ({name})")
        return {"status": "dry_run"}

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": "whatsapp_optin_confirm",
            "language": {"code": TEMPLATE_LANG},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": name or "there"},
                        {"type": "text", "text": "https://pricebasket.in/alerts"},
                    ],
                }
            ],
        },
    }
    try:
        resp = requests.post(WA_API_URL, headers=_headers(), json=payload, timeout=10)
        return resp.json()
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


# ── Scheduler ─────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


def setup_schedule():
    schedule.every(30).minutes.do(run_price_alert_notifications)
    schedule.every().monday.at("09:00").do(run_weekly_digest)
    print("WhatsApp agent scheduled: alerts every 30min, digest every Monday 9am IST")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "test" and len(sys.argv) >= 3:
            # python whatsapp_agent.py test +919876543210
            phone = sys.argv[2]
            send_template_message(
                phone=phone,
                product_name="Aashirvaad Atta 5kg",
                platform="JioMart",
                new_price=189,
                old_price=240,
                product_url="https://pricebasket.in/product/aashirvaad-atta-5kg",
            )
        elif cmd == "digest" and len(sys.argv) >= 3:
            phone = sys.argv[2]
            send_weekly_deals_broadcast(phone, fetch_top_deals())
        elif cmd == "run":
            run_price_alert_notifications()
        else:
            print("Usage: python whatsapp_agent.py [test <phone>|digest <phone>|run]")
    else:
        setup_schedule()
        while True:
            schedule.run_pending()
            time.sleep(30)
