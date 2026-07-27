"""
Executive Reports AI — FastAPI router.

Endpoints:
  GET  /executive/reports          → list reports (filter by period)
  GET  /executive/reports/latest   → most recent report for a period
  POST /executive/reports/generate → manually trigger generation (admin)
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.executive_report import ExecutiveReport
from app.services.executive_report_service import generate_report

router = APIRouter()


def _report_to_dict(r: ExecutiveReport) -> dict:
    return {
        "id": str(r.id),
        "period": r.period,
        "report_date": r.report_date.isoformat(),
        "metrics": r.metrics,
        "narrative": r.narrative,
        "generated_at": r.generated_at.isoformat() if r.generated_at else None,
    }


@router.get("/reports")
async def list_reports(
    period: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    q = select(ExecutiveReport)
    if period:
        q = q.where(ExecutiveReport.period == period)
    q = q.order_by(ExecutiveReport.report_date.desc()).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"items": [_report_to_dict(r) for r in items]}


@router.get("/reports/latest")
async def latest_report(
    period: str = Query("daily"),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    q = (
        select(ExecutiveReport)
        .where(ExecutiveReport.period == period)
        .order_by(ExecutiveReport.report_date.desc())
        .limit(1)
    )
    result = await db.execute(q)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No report generated yet")
    return _report_to_dict(report)


@router.post("/reports/generate")
async def generate_now(
    period: str = Query("daily"),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    if period not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="period must be daily, weekly, or monthly")
    report = await generate_report(db, period)
    await db.commit()
    return _report_to_dict(report)
