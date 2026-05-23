"""
Prices API — real-time price fetch, history, and alerts.
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.price import PlatformPrice, PriceAlert, PriceHistory
from app.models.user import User
from app.schemas import PlatformOut, PlatformPriceOut, PriceAlertCreate, PriceAlertOut, ProductOut
from app.services.price_engine import PriceEngine

router = APIRouter()


@router.get("/{product_id}", response_model=List[PlatformPriceOut])
async def get_product_prices(
    product_id: uuid.UUID,
    force_refresh: bool = Query(default=False, description="Bypass cache and fetch fresh prices"),
    db: AsyncSession = Depends(get_db),
):
    """Return current cross-platform prices for a product."""
    try:
        engine = PriceEngine(db)
        if force_refresh:
            await engine.force_refresh(product_id)
        else:
            await engine.get_prices(product_id)
    except Exception:
        pass

    # Load full PlatformPrice objects for response serialisation
    result = await db.execute(
        select(PlatformPrice)
        .where(PlatformPrice.product_id == product_id)
        .options(selectinload(PlatformPrice.platform))
        .order_by(PlatformPrice.price)
    )
    prices = result.scalars().all()
    return [
        PlatformPriceOut(
            platform=PlatformOut.model_validate(pp.platform),
            price=float(pp.price),
            original_price=float(pp.original_price) if pp.original_price else None,
            discount_percent=pp.discount_percent,
            discount_label=pp.discount_label,
            is_available=pp.is_available,
            delivery_time_minutes=pp.delivery_time_minutes,
            platform_product_url=pp.platform_product_url,
            last_updated=pp.last_updated,
        )
        for pp in prices
    ]


@router.get("/{product_id}/history")
async def get_price_history(
    product_id: uuid.UUID,
    platform_id: uuid.UUID | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Return historical price data for trend charts."""
    from datetime import UTC, datetime, timedelta
    from sqlalchemy.orm import selectinload

    since = datetime.now(UTC) - timedelta(days=days)
    stmt = (
        select(PriceHistory)
        .where(PriceHistory.product_id == product_id, PriceHistory.recorded_at >= since)
        .order_by(PriceHistory.recorded_at)
    )
    if platform_id:
        stmt = stmt.where(PriceHistory.platform_id == platform_id)

    result = await db.execute(stmt)
    history = result.scalars().all()
    return [
        {
            "platform_id": str(h.platform_id),
            "price": float(h.price),
            "is_available": h.is_available,
            "recorded_at": h.recorded_at.isoformat(),
        }
        for h in history
    ]


# ── Price Alerts ──────────────────────────────────────────────────────────────

@router.get("/alerts/me", response_model=List[PriceAlertOut])
async def list_my_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.user_id == current_user.id, PriceAlert.is_active == True)  # noqa
        .options(selectinload(PriceAlert.product))
    )
    return result.scalars().all()


@router.post("/alerts", response_model=PriceAlertOut, status_code=201)
async def create_alert(
    body: PriceAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = PriceAlert(
        user_id=current_user.id,
        product_id=body.product_id,
        target_price=body.target_price,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert, ["product"])
    return alert


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
