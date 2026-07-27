"""
Organic growth worker
=====================
Celery tasks for the Organic Growth Agent — Reddit/Quora AI drafts, internal
linking, headline A/B variants, trending topics, and an extra daily social
slot. All gated behind ORGANIC_GROWTH_ENABLED, one flag for the whole agent.
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


@celery_app.task(name="app.workers.organic_growth_worker.generate_reddit_quora_drafts")
def generate_reddit_quora_drafts():
    if not settings.ORGANIC_GROWTH_ENABLED:
        log.info("organic_growth_disabled")
        return
    _run_async(_generate_reddit_quora_drafts())


async def _generate_reddit_quora_drafts():
    from app.database import AsyncSessionLocal
    from app.services.reddit_quora_draft_service import generate_drafts

    async with AsyncSessionLocal() as db:
        created = await generate_drafts(db)
        await db.commit()
        log.info("reddit_quora_drafts_generated", created=created)


@celery_app.task(name="app.workers.organic_growth_worker.run_internal_linking")
def run_internal_linking():
    if not settings.ORGANIC_GROWTH_ENABLED:
        log.info("organic_growth_disabled")
        return
    _run_async(_run_internal_linking())


async def _run_internal_linking():
    from app.services.internal_link_service import scan_and_link_new_posts

    added = await scan_and_link_new_posts()
    log.info("internal_linking_done", links_added=added)


@celery_app.task(name="app.workers.organic_growth_worker.generate_headline_variants")
def generate_headline_variants():
    if not settings.ORGANIC_GROWTH_ENABLED:
        log.info("organic_growth_disabled")
        return
    _run_async(_generate_headline_variants())


async def _generate_headline_variants():
    from app.database import AsyncSessionLocal
    from app.services.content_engine import list_generated_posts
    from app.services.headline_ab_service import generate_variants_for_slug

    posts = await list_generated_posts()
    if not posts:
        log.info("headline_variants_skip_no_posts")
        return

    latest_slug = posts[0]["slug"]
    async with AsyncSessionLocal() as db:
        try:
            variant = await generate_variants_for_slug(db, latest_slug)
            await db.commit()
            log.info("headline_variants_generated", slug=latest_slug, test_id=str(variant.id))
        except ValueError as exc:
            log.info("headline_variants_skip", reason=str(exc))


@celery_app.task(name="app.workers.organic_growth_worker.check_trending_topics")
def check_trending_topics():
    if not settings.ORGANIC_GROWTH_ENABLED:
        log.info("organic_growth_disabled")
        return
    _run_async(_check_trending_topics())


async def _check_trending_topics():
    from app.database import AsyncSessionLocal
    from app.services.trending_topic_service import check_trends_and_inject

    async with AsyncSessionLocal() as db:
        created = await check_trends_and_inject(db)
        await db.commit()
        log.info("trending_topics_checked", created=created)
