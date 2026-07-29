"""
Executive worker
================
Celery tasks for the Executive/CEO Reports AI — generates a daily, weekly, or
monthly business report and stores it for the admin dashboard.

Gated behind EXEC_REPORTS_ENABLED, same as generate_daily_content /
post_daily_deal_social in marketing_worker.py.
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


@celery_app.task(name="app.workers.executive_worker.generate_executive_report")
def generate_executive_report(period: str = "daily"):
    if not settings.EXEC_REPORTS_ENABLED:
        log.info("exec_reports_disabled")
        return
    _run_async(_generate(period))


async def _generate(period: str):
    from app.database import AsyncSessionLocal
    from app.services.executive_report_service import generate_report

    async with AsyncSessionLocal() as db:
        report = await generate_report(db, period)
        await db.commit()
        log.info("executive_report_generated", period=period, report_id=str(report.id))
