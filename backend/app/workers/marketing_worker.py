"""
Marketing worker
================
Celery tasks for SEO content + social automation:

  • generate_daily_content  — build today's deal article, store it, ping IndexNow.
  • post_daily_deal_social  — render a deal card and broadcast to social channels.

Both are gated behind master switches in settings (CONTENT_AUTOMATION_ENABLED /
SOCIAL_AUTOMATION_ENABLED) and every external call degrades gracefully when its
credentials are absent — so enabling the beat schedule is safe even before any
API keys are configured.
"""
from __future__ import annotations

import asyncio

import structlog

from app.config import settings
from app.workers.celery_app import celery_app

log = structlog.get_logger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.workers.marketing_worker.generate_daily_content")
def generate_daily_content():
    if not settings.CONTENT_AUTOMATION_ENABLED:
        log.info("content_automation_disabled")
        return
    _run_async(_generate_content())


@celery_app.task(name="app.workers.marketing_worker.post_daily_deal_social")
def post_daily_deal_social():
    if not settings.SOCIAL_AUTOMATION_ENABLED:
        log.info("social_automation_disabled")
        return
    _run_async(_post_social())


# ── Async implementations ─────────────────────────────────────────────────────
async def _generate_content():
    from app.services.content_engine import generate_daily_deals_post
    from app.services.seo_ping import submit_indexnow

    post = await generate_daily_deals_post()
    if not post:
        return

    base = settings.SITE_URL.rstrip("/")
    urls = [
        f"{base}/blog/{post['slug']}",
        f"{base}/blog",
        f"{base}/sitemap.xml",
    ]
    await submit_indexnow(urls)


async def _post_social():
    from app.services.deals import get_top_deals
    from app.services.social_card import render_deal_card
    from app.services.social_poster import broadcast_deal

    deals = await get_top_deals(limit=10)
    if not deals:
        log.info("social_skip_no_deals")
        return

    # Post the single biggest deal of the cycle.
    deal = deals[0]
    card = render_deal_card(deal)
    await broadcast_deal(deal, card=card, image_url=deal.image_url)
