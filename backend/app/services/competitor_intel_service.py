"""
Competitor Intelligence AI
==========================
Analyzes PriceHistory — already collected by the existing price-refresh
Celery task via app/scrapers/ — to surface per-platform trends. No new
scraping is added here: this ships the price-trend slice achievable from
data already collected. Broader "monitor competitor homepage/campaigns"
scope from the original spec needs new scraper work and is out of scope.
"""
from __future__ import annotations

from datetime import date as date_, datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

import structlog
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competitor_intel import CompetitorInsight
from app.models.platform import Platform
from app.models.price import PriceHistory

log = structlog.get_logger(__name__)

WINDOW_DAYS = 7


def _window(as_of: Optional[date_] = None) -> Tuple[datetime, datetime, datetime]:
    as_of = as_of or datetime.now(timezone.utc).date()
    end = datetime.combine(as_of, datetime.min.time()).replace(tzinfo=timezone.utc)
    start = end - timedelta(days=WINDOW_DAYS)
    mid = start + (end - start) / 2
    return start, mid, end


async def _cheapest_share(db: AsyncSession, start: datetime, end: datetime) -> Dict[str, int]:
    """{platform_id_str: times_cheapest} — for each (product, day) in the window,
    which platform had the lowest available price."""
    q = select(
        PriceHistory.product_id,
        func.date(PriceHistory.recorded_at).label("day"),
        PriceHistory.platform_id,
        PriceHistory.price,
    ).where(
        PriceHistory.recorded_at >= start,
        PriceHistory.recorded_at < end,
        PriceHistory.is_available.is_(True),
    )
    rows = (await db.execute(q)).all()

    best: Dict[tuple, tuple] = {}
    for product_id, day, platform_id, price in rows:
        key = (product_id, day)
        if key not in best or price < best[key][1]:
            best[key] = (platform_id, price)

    tally: Dict[str, int] = {}
    for platform_id, _ in best.values():
        tally[str(platform_id)] = tally.get(str(platform_id), 0) + 1
    return tally


async def _avg_price_by_platform(db: AsyncSession, lo: datetime, hi: datetime) -> Dict[str, float]:
    q = (
        select(PriceHistory.platform_id, func.avg(PriceHistory.price))
        .where(
            PriceHistory.recorded_at >= lo,
            PriceHistory.recorded_at < hi,
            PriceHistory.is_available.is_(True),
        )
        .group_by(PriceHistory.platform_id)
    )
    return {str(pid): float(avg) for pid, avg in (await db.execute(q)).all()}


async def _stockout_rate(db: AsyncSession, start: datetime, end: datetime) -> Dict[str, float]:
    q = (
        select(
            PriceHistory.platform_id,
            func.count().label("total"),
            func.sum(case((PriceHistory.is_available.is_(False), 1), else_=0)).label("out_of_stock"),
        )
        .where(PriceHistory.recorded_at >= start, PriceHistory.recorded_at < end)
        .group_by(PriceHistory.platform_id)
    )
    result: Dict[str, float] = {}
    for platform_id, total, out_of_stock in (await db.execute(q)).all():
        result[str(platform_id)] = round((out_of_stock or 0) / total, 4) if total else 0.0
    return result


async def analyze_competitor_trends(db: AsyncSession, as_of: Optional[date_] = None) -> list[CompetitorInsight]:
    start, mid, end = _window(as_of)
    period_start, period_end = start.date(), end.date()

    cheapest = await _cheapest_share(db, start, end)
    total_cheapest = sum(cheapest.values()) or 1
    avg_first_half = await _avg_price_by_platform(db, start, mid)
    avg_second_half = await _avg_price_by_platform(db, mid, end)
    stockouts = await _stockout_rate(db, start, end)

    platforms = (await db.execute(select(Platform).where(Platform.is_active.is_(True)))).scalars().all()

    insights: list[CompetitorInsight] = []
    for platform in platforms:
        pid = str(platform.id)

        cheapest_count = cheapest.get(pid, 0)
        cheapest_pct = round((cheapest_count / total_cheapest) * 100, 1)
        insights.append(
            CompetitorInsight(
                platform_id=platform.id,
                insight_type="cheapest_share",
                period_start=period_start,
                period_end=period_end,
                data={"times_cheapest": cheapest_count, "share_pct": cheapest_pct},
                summary=f"{platform.name} was the cheapest option {cheapest_pct}% of the time this week.",
            )
        )

        s, e = avg_first_half.get(pid), avg_second_half.get(pid)
        pct_change = round(((e - s) / s) * 100, 2) if s and e else None
        direction = "rising" if (pct_change or 0) > 0 else "falling" if (pct_change or 0) < 0 else "flat"
        insights.append(
            CompetitorInsight(
                platform_id=platform.id,
                insight_type="price_trend",
                period_start=period_start,
                period_end=period_end,
                data={"avg_first_half": s, "avg_second_half": e, "pct_change": pct_change},
                summary=(
                    f"{platform.name}'s average tracked price is {direction} "
                    f"({pct_change if pct_change is not None else 'n/a'}% over the week)."
                    if s and e else f"Not enough price history for {platform.name} yet."
                ),
            )
        )

        stockout_pct = round(stockouts.get(pid, 0.0) * 100, 1)
        insights.append(
            CompetitorInsight(
                platform_id=platform.id,
                insight_type="stockout_pattern",
                period_start=period_start,
                period_end=period_end,
                data={"stockout_rate_pct": stockout_pct},
                summary=f"{platform.name} showed products out of stock {stockout_pct}% of tracked checks this week.",
            )
        )

    for insight in insights:
        db.add(insight)
    await db.flush()
    log.info("competitor_insights_generated", count=len(insights))
    return insights
