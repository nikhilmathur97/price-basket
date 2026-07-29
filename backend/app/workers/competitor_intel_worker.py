"""
Competitor intel worker
=======================
Celery task for the Competitor Intelligence AI — analyzes the existing
PriceHistory table for per-platform trends. Gated behind
COMPETITOR_INTEL_ENABLED, same pattern as executive_worker.py.
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


@celery_app.task(name="app.workers.competitor_intel_worker.analyze_competitor_trends")
def analyze_competitor_trends():
    if not settings.COMPETITOR_INTEL_ENABLED:
        log.info("competitor_intel_disabled")
        return
    _run_async(_analyze())


async def _analyze():
    from app.database import AsyncSessionLocal
    from app.services.competitor_intel_service import analyze_competitor_trends as _run

    async with AsyncSessionLocal() as db:
        insights = await _run(db)
        await db.commit()
        log.info("competitor_intel_generated", count=len(insights))
