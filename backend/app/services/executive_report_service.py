"""
Executive Reports AI
=====================
Aggregates existing analytics (UserEvent, MarketingContent) into a
daily/weekly/monthly business report, then asks the shared AI engine to turn
the numbers into a short narrative + growth recommendations. Degrades to a
plain templated summary when no AI provider is configured — never blocks.
"""
from __future__ import annotations

from datetime import date as date_, datetime, timedelta, timezone
from typing import Optional, Tuple

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.marketing.ai_engine import ai_engine
from app.models.analytics import UserEvent
from app.models.executive_report import ExecutiveReport
from app.models.marketing import MarketingContent

log = structlog.get_logger(__name__)

_PERIOD_DAYS = {"daily": 1, "weekly": 7, "monthly": 30}

REPORT_SYSTEM_PROMPT = (
    "You are PriceBasket's CEO AI. Given raw business metrics for the period, "
    "write a concise executive summary (max 150 words) covering what happened, "
    "then exactly 3 numbered, concrete growth recommendations. No fluff, no "
    "generic advice — reference the actual numbers given."
)


def _window(period: str, as_of: Optional[date_] = None) -> Tuple[datetime, datetime]:
    as_of = as_of or datetime.now(timezone.utc).date()
    days = _PERIOD_DAYS.get(period, 1)
    end = datetime.combine(as_of, datetime.min.time()).replace(tzinfo=timezone.utc)
    start = end - timedelta(days=days)
    return start, end


async def compute_metrics(db: AsyncSession, period: str, as_of: Optional[date_] = None) -> dict:
    start, end = _window(period, as_of)

    def _in_window(*extra):
        conds = [UserEvent.created_at >= start, UserEvent.created_at < end]
        conds.extend(extra)
        return conds

    active_users = await db.scalar(
        select(func.count(func.distinct(UserEvent.client_id))).where(*_in_window())
    ) or 0
    active_registered_users = await db.scalar(
        select(func.count(func.distinct(UserEvent.user_id))).where(
            *_in_window(UserEvent.user_id.isnot(None))
        )
    ) or 0
    redirects = await db.scalar(
        select(func.count()).select_from(UserEvent).where(
            *_in_window(UserEvent.event_type == "platform_redirect")
        )
    ) or 0
    searches = await db.scalar(
        select(func.count()).select_from(UserEvent).where(
            *_in_window(UserEvent.event_type == "search")
        )
    ) or 0
    checkouts = await db.scalar(
        select(func.count()).select_from(UserEvent).where(
            *_in_window(UserEvent.event_type == "checkout_start")
        )
    ) or 0

    top_products_q = (
        select(UserEvent.product_id, func.count().label("views"))
        .where(
            *_in_window(
                UserEvent.event_type == "product_view",
                UserEvent.product_id.isnot(None),
            )
        )
        .group_by(UserEvent.product_id)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_products = [
        {"product_id": str(pid), "views": views}
        for pid, views in (await db.execute(top_products_q)).all()
    ]

    content_published = await db.scalar(
        select(func.count()).select_from(MarketingContent).where(
            MarketingContent.published_at.isnot(None),
            MarketingContent.published_at >= start,
            MarketingContent.published_at < end,
        )
    ) or 0

    return {
        "period": period,
        "window": {"start": start.isoformat(), "end": end.isoformat()},
        "active_users": active_users,
        "active_registered_users": active_registered_users,
        "platform_redirects": redirects,
        "searches": searches,
        "checkout_starts": checkouts,
        "top_products_by_views": top_products,
        "content_published": content_published,
    }


def _fallback_narrative(metrics: dict) -> str:
    return (
        f"{metrics['period'].capitalize()} summary: {metrics['active_users']} active users, "
        f"{metrics['platform_redirects']} platform redirects, {metrics['searches']} searches, "
        f"{metrics['content_published']} pieces of content published.\n\n"
        "1. Set up an AI provider key (GEMINI_API_KEY or ANTHROPIC_API_KEY) to get "
        "AI-written analysis here.\n"
        "2. Review top viewed products for merchandising opportunities.\n"
        "3. Compare this period's redirects against the prior period to track growth."
    )


async def generate_narrative(metrics: dict) -> str:
    if not ai_engine.status()["ready"]:
        return _fallback_narrative(metrics)
    prompt = f"Metrics for this {metrics['period']} report:\n{metrics}"
    try:
        chunks = [
            c async for c in ai_engine.stream(
                prompt, system=REPORT_SYSTEM_PROMPT, agent_id="executive_report"
            )
        ]
        text = "".join(chunks).strip()
        return text or _fallback_narrative(metrics)
    except Exception as exc:
        log.warning("executive_narrative_failed", error=str(exc))
        return _fallback_narrative(metrics)


async def generate_report(
    db: AsyncSession, period: str, as_of: Optional[date_] = None
) -> ExecutiveReport:
    metrics = await compute_metrics(db, period, as_of)
    narrative = await generate_narrative(metrics)
    report = ExecutiveReport(
        period=period,
        report_date=as_of or datetime.now(timezone.utc).date(),
        metrics=metrics,
        narrative=narrative,
    )
    db.add(report)
    await db.flush()
    return report
