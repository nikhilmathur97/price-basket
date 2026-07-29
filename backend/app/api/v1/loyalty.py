"""
Referral + Loyalty AI — FastAPI router.

User-facing:
  GET  /loyalty/me      → own balance/streak/badges/referral code
  POST /loyalty/redeem  → redeem a referral code

Admin:
  GET  /loyalty/leaderboard
  GET  /loyalty/stats
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user, require_admin
from app.models.loyalty import LoyaltyAccount, LoyaltyBadge, ReferralCode, ReferralConversion
from app.models.user import User
from app.services import loyalty_service, referral_service

router = APIRouter()


class RedeemRequest(BaseModel):
    code: str


@router.get("/me")
async def my_loyalty(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = await loyalty_service.get_or_create_account(db, user.id)
    referral_code = await referral_service.get_or_create_code(db, user.id)
    badges = (
        await db.execute(select(LoyaltyBadge.badge_code).where(LoyaltyBadge.user_id == user.id))
    ).scalars().all()
    await db.commit()
    return {
        "coins_balance": account.coins_balance,
        "current_streak_days": account.current_streak_days,
        "longest_streak_days": account.longest_streak_days,
        "referral_code": referral_code.code,
        "badges": list(badges),
    }


@router.post("/redeem")
async def redeem(
    payload: RedeemRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversion = await referral_service.redeem_code(db, payload.code, user.id)
    if not conversion:
        raise HTTPException(status_code=400, detail="Invalid referral code, or you already redeemed one")
    await db.commit()
    return {"status": conversion.status}


@router.get("/leaderboard")
async def leaderboard(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    return {"items": await loyalty_service.get_leaderboard(db, limit)}


@router.get("/stats")
async def stats(
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    total_coins = await db.scalar(select(func.sum(LoyaltyAccount.coins_balance))) or 0
    codes_generated = await db.scalar(select(func.count()).select_from(ReferralCode)) or 0
    redeemed = await db.scalar(select(func.count()).select_from(ReferralConversion)) or 0
    rewarded = await db.scalar(
        select(func.count()).select_from(ReferralConversion).where(ReferralConversion.status == "rewarded")
    ) or 0
    return {
        "total_coins_distributed": total_coins,
        "referral_codes_generated": codes_generated,
        "referrals_redeemed": redeemed,
        "referrals_rewarded": rewarded,
    }
