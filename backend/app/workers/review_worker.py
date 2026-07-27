"""
Review worker
=============
Celery task for the Review Management AI — ingests new reviews, classifies
sentiment, drafts AI replies, and escalates negative ones. Never posts a
reply automatically (see review_management_service.post_reply, called only
from the admin-approved API endpoint). Gated behind REVIEW_MANAGEMENT_ENABLED.
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


@celery_app.task(name="app.workers.review_worker.scan_reviews")
def scan_reviews():
    if not settings.REVIEW_MANAGEMENT_ENABLED:
        log.info("review_management_disabled")
        return
    _run_async(_scan())


async def _scan():
    from app.database import AsyncSessionLocal
    from app.services.review_management_service import scan_reviews as _run

    async with AsyncSessionLocal() as db:
        result = await _run(db)
        await db.commit()
        log.info("reviews_scanned", **result)
