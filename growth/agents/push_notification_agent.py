#!/usr/bin/env python3
"""
PRICEBASKET.IN — Browser Push Notification Agent
=================================================
Sends browser push notifications for price drops without requiring a mobile app.
Uses the Web Push Protocol (RFC 8030) via VAPID keys.

How it works:
  1. Frontend registers service worker + subscribes user to push
  2. Subscription endpoint stored in backend DB
  3. This agent polls for triggered price alerts every 15 minutes
  4. Sends push notifications to all subscribed users for their tracked products

GA4 event: notification_click → session_start (tracked via UTM in notification URL)

Setup:
  pip install pywebpush requests schedule
  Generate VAPID keys:
    python -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print(v.private_key, v.public_key)"
  Set env vars:
    VAPID_PRIVATE_KEY   — base64url-encoded private key
    VAPID_PUBLIC_KEY    — base64url-encoded public key (also set in frontend)
    VAPID_CLAIMS_EMAIL  — mailto:admin@pricebasket.in
    BACKEND_API_URL
"""

import os
import json
import time
import datetime
import schedule
import requests

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False

# ── Config ────────────────────────────────────────────────────────────────────
VAPID_PRIVATE_KEY   = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY    = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_EMAIL  = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@pricebasket.in")
BACKEND_API         = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
SITE_URL            = "https://pricebasket.in"

# Dedup: {subscription_id + product: date}
_notified_today: dict[str, str] = {}

# ── Notification payload templates ───────────────────────────────────────────

def build_price_drop_payload(
    product_name: str,
    platform: str,
    new_price: float,
    old_price: float,
    product_slug: str,
) -> dict:
    """Build Web Push notification payload for a price drop."""
    savings = round(old_price - new_price)
    pct_off = round((savings / old_price) * 100)
    utm_url = (
        f"{SITE_URL}/product/{product_slug}"
        f"?utm_source=push&utm_medium=notification"
        f"&utm_campaign=price-drop&utm_content={product_slug}"
    )
    return {
        "title":   f"🚨 Price Drop! {product_name}",
        "body":    f"Now ₹{int(new_price)} on {platform} (was ₹{int(old_price)}) — Save ₹{savings} ({pct_off}% off)!",
        "icon":    f"{SITE_URL}/icons/notification-icon-192.png",
        "badge":   f"{SITE_URL}/icons/badge-72.png",
        "url":     utm_url,
        "tag":     f"price-drop-{product_slug}",
        "actions": [
            {"action": "buy",     "title": f"Buy on {platform}"},
            {"action": "compare", "title": "Compare All Apps"},
        ],
        "data": {
            "product_slug": product_slug,
            "platform":     platform,
            "new_price":    new_price,
            "old_price":    old_price,
            "savings":      savings,
        },
    }


def build_weekly_deals_payload(top_deal: dict) -> dict:
    """Build weekly deals digest notification."""
    utm_url = (
        f"{SITE_URL}/best-grocery-deals"
        f"?utm_source=push&utm_medium=notification"
        f"&utm_campaign=weekly-deals"
    )
    return {
        "title": "🛒 This Week's Top Grocery Deals",
        "body":  (
            f"Top deal: {top_deal.get('name','?')} at ₹{int(top_deal.get('best_price',0))} "
            f"on {top_deal.get('cheapest_platform','?')}. Save ₹{int(top_deal.get('savings_amount',0))}!"
        ),
        "icon":  f"{SITE_URL}/icons/notification-icon-192.png",
        "badge": f"{SITE_URL}/icons/badge-72.png",
        "url":   utm_url,
        "tag":   "weekly-deals",
    }


# ── Send push notification ────────────────────────────────────────────────────

def send_push_notification(subscription: dict, payload: dict) -> bool:
    """
    Send a Web Push notification to a single subscriber.
    subscription = {endpoint, keys: {p256dh, auth}}
    """
    if not WEBPUSH_AVAILABLE:
        print(f"[DRY RUN] Push → {subscription.get('endpoint','?')[:50]}...")
        print(f"          Title: {payload['title']}")
        print(f"          Body:  {payload['body']}")
        return True

    if not VAPID_PRIVATE_KEY:
        print("[Push] No VAPID private key — skipping")
        return False

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": VAPID_CLAIMS_EMAIL,
                "aud": subscription["endpoint"].split("/")[2],  # origin
            },
        )
        return True
    except WebPushException as exc:
        # 410 Gone = subscription expired, should be removed from DB
        if "410" in str(exc):
            _remove_expired_subscription(subscription.get("endpoint", ""))
        else:
            print(f"[Push] WebPushException: {exc}")
        return False
    except Exception as exc:
        print(f"[Push] Error: {exc}")
        return False


def _remove_expired_subscription(endpoint: str):
    """Remove expired push subscription from backend."""
    try:
        requests.delete(
            f"{BACKEND_API}/api/v1/growth/push-subscriptions",
            json={"endpoint": endpoint},
            timeout=10,
        )
        print(f"[Push] Removed expired subscription: {endpoint[:50]}...")
    except Exception:
        pass


# ── Fetch data from backend ───────────────────────────────────────────────────

def fetch_triggered_price_alerts() -> list[dict]:
    """
    GET /api/v1/growth/push-alerts
    Returns list of:
      { subscription, product_name, platform, new_price, old_price, product_slug }
    """
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/growth/push-alerts",
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("alerts", [])
    except Exception as exc:
        print(f"[Push] fetch_triggered_price_alerts error: {exc}")
    return []


def fetch_all_push_subscribers() -> list[dict]:
    """
    GET /api/v1/growth/push-subscriptions
    Returns list of push subscription objects.
    """
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/growth/push-subscriptions",
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("subscriptions", [])
    except Exception as exc:
        print(f"[Push] fetch_all_push_subscribers error: {exc}")
    return []


def fetch_top_deal() -> dict:
    """Fetch the top deal for weekly digest."""
    try:
        resp = requests.get(
            f"{BACKEND_API}/api/v1/products/featured?limit=1",
            timeout=15,
        )
        if resp.ok:
            items = resp.json().get("items", [])
            return items[0] if items else {}
    except Exception as exc:
        print(f"[Push] fetch_top_deal error: {exc}")
    return {}


# ── Main runners ──────────────────────────────────────────────────────────────

def run_price_drop_notifications():
    """
    Runs every 15 minutes.
    Sends push notifications for triggered price alerts.
    Max 1 notification per (subscription, product) per day.
    """
    today  = datetime.date.today().isoformat()
    alerts = fetch_triggered_price_alerts()
    sent   = 0
    skipped = 0

    for alert in alerts:
        subscription  = alert.get("subscription", {})
        product_name  = alert.get("product_name", "")
        endpoint      = subscription.get("endpoint", "")

        if not endpoint or not product_name:
            continue

        dedup_key = f"{endpoint[-20:]}::{product_name}::{today}"
        if dedup_key in _notified_today:
            skipped += 1
            continue

        payload = build_price_drop_payload(
            product_name=product_name,
            platform=alert.get("platform", ""),
            new_price=alert.get("new_price", 0),
            old_price=alert.get("old_price", 0),
            product_slug=alert.get("product_slug", product_name.lower().replace(" ", "-")),
        )

        success = send_push_notification(subscription, payload)
        if success:
            _notified_today[dedup_key] = today
            sent += 1
        time.sleep(0.1)  # 10 notifications/sec max

    # Clean old dedup keys
    for key in list(_notified_today.keys()):
        if not key.endswith(today):
            del _notified_today[key]

    print(f"[{_now()}] Push notifications: {sent} sent, {skipped} skipped (dedup)")


def run_weekly_deals_broadcast():
    """
    Runs every Monday at 10am IST.
    Sends weekly deals digest to ALL push subscribers.
    """
    subscribers = fetch_all_push_subscribers()
    top_deal    = fetch_top_deal()

    if not top_deal:
        print(f"[{_now()}] Weekly push: no deals found, skipping")
        return

    payload = build_weekly_deals_payload(top_deal)
    sent    = 0

    for sub in subscribers:
        success = send_push_notification(sub, payload)
        if success:
            sent += 1
        time.sleep(0.1)

    print(f"[{_now()}] Weekly push digest sent to {sent}/{len(subscribers)} subscribers")


# ── Service worker snippet (for frontend integration) ─────────────────────────

SERVICE_WORKER_SNIPPET = """
// Add to public/sw.js or pages/sw.js

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body:    data.body    || 'New price drop on PriceBasket!',
    icon:    data.icon    || '/icons/notification-icon-192.png',
    badge:   data.badge   || '/icons/badge-72.png',
    tag:     data.tag     || 'pricebasket',
    actions: data.actions || [],
    data:    data.data    || {},
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'PriceBasket Alert', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || 'https://pricebasket.in';
  event.waitUntil(clients.openWindow(url));
  // GA4 tracking happens on page load via UTM params
});
"""

SUBSCRIBE_SNIPPET = """
// Add to your React/Next.js component

async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });
  // Send subscription to backend
  await fetch('/api/v1/growth/push-subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  // Track in GA4
  gtag('event', 'push_subscribe', { method: 'browser_push' });
}
"""


def _now() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


def setup_schedule():
    schedule.every(15).minutes.do(run_price_drop_notifications)
    schedule.every().monday.at("10:00").do(run_weekly_deals_broadcast)
    print("Push notification agent scheduled: alerts every 15min, digest every Monday 10am IST")


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "run":
        setup_schedule()
        while True:
            schedule.run_pending()
            time.sleep(30)
    elif cmd == "test":
        # Send a test notification (dry run)
        test_sub = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {"p256dh": "test", "auth": "test"},
        }
        payload = build_price_drop_payload(
            "Aashirvaad Atta 5kg", "JioMart", 189, 240,
            "aashirvaad-atta-5kg"
        )
        print("Test notification payload:")
        print(json.dumps(payload, indent=2))
    elif cmd == "sw":
        print("Service Worker snippet:")
        print(SERVICE_WORKER_SNIPPET)
        print("\nSubscribe snippet:")
        print(SUBSCRIBE_SNIPPET)
    elif cmd == "alerts":
        run_price_drop_notifications()
    elif cmd == "weekly":
        run_weekly_deals_broadcast()
    else:
        print("Usage: python push_notification_agent.py [run|test|sw|alerts|weekly]")
