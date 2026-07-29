"""
Competitor Intelligence AI — FastAPI router.

Endpoints:
  GET  /competitor-intel/insights  → list insights (filter by platform/type)
  POST /competitor-intel/analyze   → manually trigger analysis (admin)
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.competitor_intel import CompetitorInsight
from app.models.platform import Platform
from app.services.competitor_intel_service import analyze_competitor_trends

router = APIRouter()


def _insight_to_dict(i: CompetitorInsight, platform_name: Optional[str] = None) -> dict:
    return {
        "id": str(i.id),
        "platform_id": str(i.platform_id),
        "platform_name": platform_name,
        "insight_type": i.insight_type,
        "product_id": str(i.product_id) if i.product_id else None,
        "period_start": i.period_start.isoformat(),
        "period_end": i.period_end.isoformat(),
        "data": i.data,
        "summary": i.summary,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }


@router.get("/insights")
async def list_insights(
    platform_slug: Optional[str] = Query(None),
    insight_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    q = select(CompetitorInsight, Platform.name).join(Platform, Platform.id == CompetitorInsight.platform_id)
    if platform_slug:
        q = q.where(Platform.slug == platform_slug)
    if insight_type:
        q = q.where(CompetitorInsight.insight_type == insight_type)
    q = q.order_by(CompetitorInsight.created_at.desc()).limit(limit)
    result = await db.execute(q)
    rows = result.all()
    return {"items": [_insight_to_dict(i, name) for i, name in rows]}


@router.post("/analyze")
async def analyze_now(
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    insights = await analyze_competitor_trends(db)
    await db.commit()
    return {"generated": len(insights)}
