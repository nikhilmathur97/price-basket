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
