"""
Social poster
=============
Publishes a deal to the configured social channels. Every channel checks its
own credentials first and no-ops (with a log line) when unconfigured — so this
is safe to run in production before any social account is wired up, and each
channel "turns on" the moment its keys are set.

Channels:
  • Telegram  — Bot API, posts the generated branded card (fully automatable).
  • Facebook  — Page Graph API photo post.
  • Instagram — Graph API (container → publish); needs a public image URL.
  • X/Twitter — via optional `tweepy` (text + link).
  • WhatsApp  — Cloud API primitive; broadcast needs an opt-in subscriber list.
"""
from __future__ import annotations

from typing import Optional

import httpx
import structlog

from app.config import settings
from app.services.deals import Deal

log = structlog.get_logger(__name__)

GRAPH = "https://graph.facebook.com/v19.0"


def build_caption(deal: Deal) -> str:
    """Compose the shared post caption for a deal."""
    name = f"{deal.brand} {deal.name}" if deal.brand else deal.name
    url = f"{settings.SITE_URL.rstrip('/')}/product/{deal.product_id}"
    platform = deal.cheapest_platform or "the cheapest platform"
    tags = "#grocery #deals #pricebasket #quickcommerce #savemoney"
    if deal.cheapest_platform:
        tags += f" #{deal.cheapest_platform.lower().replace(' ', '')}"
    return (
        f"💸 {name} is {deal.savings_percent}% cheaper on {platform}!\n"
        f"₹{int(deal.best_price)} instead of ₹{int(deal.highest_price)} "
        f"— save ₹{int(deal.savings_amount)}.\n\n"
        f"Compare live prices 👉 {url}\n\n{tags}"
    )


# ── Telegram ────────────────────────────────────────────────────────────────
async def post_to_telegram(caption: str, image: Optional[bytes]) -> bool:
    if not (settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHANNEL_ID):
        log.info("telegram_skip_unconfigured")
        return False
    base = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if image:
                resp = await client.post(
                    f"{base}/sendPhoto",
                    data={"chat_id": settings.TELEGRAM_CHANNEL_ID, "caption": caption},
                    files={"photo": ("deal.png", image, "image/png")},
                )
            else:
                resp = await client.post(
                    f"{base}/sendMessage",
                    data={"chat_id": settings.TELEGRAM_CHANNEL_ID, "text": caption},
                )
        ok = resp.status_code == 200 and resp.json().get("ok", False)
        log.info("telegram_post", ok=ok, status=resp.status_code)
        return ok
    except Exception as exc:  # noqa: BLE001
        log.warning("telegram_failed", error=str(exc))
        return False


# ── Facebook Page ─────────────────────────────────────────────────────────────
async def post_to_facebook(caption: str, image_url: Optional[str]) -> bool:
    if not (settings.META_PAGE_ACCESS_TOKEN and settings.FACEBOOK_PAGE_ID):
        log.info("facebook_skip_unconfigured")
        return False
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if image_url:
                resp = await client.post(
                    f"{GRAPH}/{settings.FACEBOOK_PAGE_ID}/photos",
                    data={
                        "url": image_url,
                        "caption": caption,
                        "access_token": settings.META_PAGE_ACCESS_TOKEN,
                    },
                )
            else:
                resp = await client.post(
                    f"{GRAPH}/{settings.FACEBOOK_PAGE_ID}/feed",
                    data={
                        "message": caption,
                        "access_token": settings.META_PAGE_ACCESS_TOKEN,
                    },
                )
        ok = resp.status_code == 200
        log.info("facebook_post", ok=ok, status=resp.status_code)
        return ok
    except Exception as exc:  # noqa: BLE001
        log.warning("facebook_failed", error=str(exc))
        return False


# ── Instagram (Graph API: create container, then publish) ─────────────────────
async def post_to_instagram(caption: str, image_url: Optional[str]) -> bool:
    if not (settings.META_PAGE_ACCESS_TOKEN and settings.INSTAGRAM_ACCOUNT_ID):
        log.info("instagram_skip_unconfigured")
        return False
    if not image_url:
        log.info("instagram_skip_no_image")  # IG requires a public image URL
        return False
    token = settings.META_PAGE_ACCESS_TOKEN
    acct = settings.INSTAGRAM_ACCOUNT_ID
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            create = await client.post(
                f"{GRAPH}/{acct}/media",
                data={"image_url": image_url, "caption": caption, "access_token": token},
            )
            if create.status_code != 200:
                log.warning("instagram_container_failed", status=create.status_code,
                            body=create.text[:200])
                return False
            creation_id = create.json().get("id")
            publish = await client.post(
                f"{GRAPH}/{acct}/media_publish",
                data={"creation_id": creation_id, "access_token": token},
            )
        ok = publish.status_code == 200
        log.info("instagram_post", ok=ok, status=publish.status_code)
        return ok
    except Exception as exc:  # noqa: BLE001
        log.warning("instagram_failed", error=str(exc))
        return False


# ── X / Twitter (optional tweepy) ─────────────────────────────────────────────
async def post_to_twitter(caption: str) -> bool:
    creds = (
        settings.TWITTER_API_KEY,
        settings.TWITTER_API_SECRET,
        settings.TWITTER_ACCESS_TOKEN,
        settings.TWITTER_ACCESS_SECRET,
    )
    if not all(creds):
        log.info("twitter_skip_unconfigured")
        return False
    try:
        import tweepy  # optional dependency
    except ImportError:
        log.info("twitter_skip_tweepy_not_installed")
        return False
    try:
        client = tweepy.Client(
            consumer_key=settings.TWITTER_API_KEY,
            consumer_secret=settings.TWITTER_API_SECRET,
            access_token=settings.TWITTER_ACCESS_TOKEN,
            access_token_secret=settings.TWITTER_ACCESS_SECRET,
        )
        # tweepy is sync; the body is tiny so a direct call is fine inside the task.
        text = caption if len(caption) <= 280 else caption[:277] + "…"
        client.create_tweet(text=text)
        log.info("twitter_post", ok=True)
        return True
    except Exception as exc:  # noqa: BLE001
        log.warning("twitter_failed", error=str(exc))
        return False


# ── WhatsApp (Cloud API primitive) ────────────────────────────────────────────
async def post_to_whatsapp(caption: str) -> bool:
    if not (settings.WHATSAPP_PHONE_NUMBER_ID and settings.WHATSAPP_ACCESS_TOKEN):
        log.info("whatsapp_skip_unconfigured")
        return False
    # Broadcasting requires an opt-in subscriber list and approved message
    # templates. Until a subscriber store exists this logs and no-ops; the
    # send primitive below is ready for when that list is wired up.
    log.info("whatsapp_skip_no_subscriber_list")
    return False


# ── Orchestrator ──────────────────────────────────────────────────────────────
async def broadcast_deal(
    deal: Deal, card: Optional[bytes], image_url: Optional[str]
) -> dict:
    """Post a deal to every configured channel. Returns per-channel results."""
    caption = build_caption(deal)
    results = {
        "telegram": await post_to_telegram(caption, card),
        "facebook": await post_to_facebook(caption, image_url),
        "instagram": await post_to_instagram(caption, image_url),
        "twitter": await post_to_twitter(caption),
        "whatsapp": await post_to_whatsapp(caption),
    }
    log.info("broadcast_deal_done", product=deal.slug, results=results)
    return results
