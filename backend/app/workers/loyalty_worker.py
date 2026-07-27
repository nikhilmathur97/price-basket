"""
Loyalty worker
==============
Celery tasks for the Referral + Loyalty AI:
  - process_referral_conversions — every 15 min, rewards any pending referral
    whose referred user has completed a real action (fast turnaround so new
    users see their bonus quickly).
  - reconcile_streaks_and_badges — nightly, recomputes streaks/badges for all
    recently-active users.

Both gated behind REFERRAL_LOYALTY_ENABLED.
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


@celery_app.task(name="app.workers.loyalty_worker.process_referral_conversions")
def process_referral_conversions():
    if not settings.REFERRAL_LOYALTY_ENABLED:
        log.info("referral_loyalty_disabled")
        return
    _run_async(_process_conversions())


@celery_app.task(name="app.workers.loyalty_worker.reconcile_streaks_and_badges")
def reconcile_streaks_and_badges():
    if not settings.REFERRAL_LOYALTY_ENABLED:
        log.info("referral_loyalty_disabled")
        return
    _run_async(_reconcile())


async def _process_conversions():
    from app.database import AsyncSessionLocal
    from app.services.referral_service import process_pending_conversions

    async with AsyncSessionLocal() as db:
        rewarded = await process_pending_conversions(db)
        await db.commit()
        log.info("referral_conversions_processed", rewarded=rewarded)


async def _reconcile():
    from app.database import AsyncSessionLocal
    from app.services.loyalty_service import reconcile_all

    async with AsyncSessionLocal() as db:
        result = await reconcile_all(db)
        await db.commit()
        log.info("loyalty_reconciled", **result)
