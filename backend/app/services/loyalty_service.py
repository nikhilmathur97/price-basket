"""
Loyalty AI
==========
Coins, streaks, and badges — derived from existing UserEvent activity, no
new tracking pipeline needed.
"""
from __future__ import annotations

import uuid
from datetime import date as date_, datetime, timedelta, timezone
from typing import List

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.analytics import UserEvent
from app.models.loyalty import LoyaltyAccount, LoyaltyBadge, LoyaltyTransaction, ReferralConversion

log = structlog.get_logger(__name__)

BADGES = {
    "explorer_10": {"label": "Explorer", "description": "10 platform redirects"},
    "streak_7": {"label": "7-Day Streak", "description": "Active 7 days in a row"},
    "referrer_5": {"label": "Super Referrer", "description": "5 rewarded referrals"},
}


async def get_or_create_account(db: AsyncSession, user_id: uuid.UUID) -> LoyaltyAccount:
    account = (
        await db.execute(select(LoyaltyAccount).where(LoyaltyAccount.user_id == user_id))
    ).scalar_one_or_none()
    if account:
        return account
    account = LoyaltyAccount(user_id=user_id)
    db.add(account)
    await db.flush()
    return account


async def award_coins(db: AsyncSession, user_id: uuid.UUID, delta: int, reason: str) -> LoyaltyAccount:
    account = await get_or_create_account(db, user_id)
    account.coins_balance += delta
    db.add(LoyaltyTransaction(user_id=user_id, delta=delta, reason=reason))
    await db.flush()
    return account


async def _active_days(db: AsyncSession, user_id: uuid.UUID, since: datetime) -> List[date_]:
    q = (
        select(func.date(UserEvent.created_at))
        .where(UserEvent.user_id == user_id, UserEvent.created_at >= since)
        .distinct()
        .order_by(func.date(UserEvent.created_at))
    )
    return [row[0] for row in (await db.execute(q)).all()]


async def update_streak(db: AsyncSession, user_id: uuid.UUID) -> LoyaltyAccount:
    account = await get_or_create_account(db, user_id)
    since = datetime.now(timezone.utc) - timedelta(days=90)
    days = await _active_days(db, user_id, since)
    if not days:
        return account

    today = datetime.now(timezone.utc).date()
    if days[-1] not in (today, today - timedelta(days=1)):
        # last activity older than yesterday — streak broken
        account.current_streak_days = 0
        account.last_activity_date = days[-1]
        await db.flush()
        return account

    streak = 1
    for i in range(len(days) - 1, 0, -1):
        if (days[i] - days[i - 1]).days == 1:
            streak += 1
        else:
            break

    account.current_streak_days = streak
    account.longest_streak_days = max(account.longest_streak_days, streak)
    account.last_activity_date = days[-1]

    if streak > 0 and streak % 7 == 0:
        await award_coins(db, user_id, settings.DAILY_STREAK_BONUS_COINS * 7, "daily_streak")

    await db.flush()
    return account


async def check_badges(db: AsyncSession, user_id: uuid.UUID) -> List[str]:
    account = await get_or_create_account(db, user_id)
    earned = set(
        (await db.execute(select(LoyaltyBadge.badge_code).where(LoyaltyBadge.user_id == user_id))).scalars().all()
    )
    newly_earned: List[str] = []

    redirects = await db.scalar(
        select(func.count()).select_from(UserEvent).where(
            UserEvent.user_id == user_id, UserEvent.event_type == "platform_redirect"
        )
    ) or 0
    if redirects >= 10 and "explorer_10" not in earned:
        newly_earned.append("explorer_10")

    if account.current_streak_days >= 7 and "streak_7" not in earned:
        newly_earned.append("streak_7")

    rewarded_referrals = await db.scalar(
        select(func.count()).select_from(ReferralConversion).where(
            ReferralConversion.referrer_user_id == user_id, ReferralConversion.status == "rewarded"
        )
    ) or 0
    if rewarded_referrals >= 5 and "referrer_5" not in earned:
        newly_earned.append("referrer_5")

    for badge_code in newly_earned:
        db.add(LoyaltyBadge(user_id=user_id, badge_code=badge_code))
        await award_coins(db, user_id, settings.BADGE_BONUS_COINS, "badge_earned")

    if newly_earned:
        await db.flush()
    return newly_earned


async def get_leaderboard(db: AsyncSession, limit: int = 20) -> list[dict]:
    from app.models.user import User

    q = (
        select(User.id, User.full_name, LoyaltyAccount.coins_balance, LoyaltyAccount.current_streak_days)
        .join(LoyaltyAccount, LoyaltyAccount.user_id == User.id)
        .order_by(LoyaltyAccount.coins_balance.desc())
        .limit(limit)
    )
    rows = (await db.execute(q)).all()
    return [
        {"user_id": str(uid), "full_name": name, "coins_balance": coins, "current_streak_days": streak}
        for uid, name, coins, streak in rows
    ]


async def reconcile_all(db: AsyncSession) -> dict:
    """Nightly: recompute streaks + badges for every user with recent activity,
    and reward any referral conversions that have completed since the last run."""
    from app.services.referral_service import process_pending_conversions

    since = datetime.now(timezone.utc) - timedelta(days=2)
    user_ids = (
        await db.execute(
            select(UserEvent.user_id)
            .where(UserEvent.user_id.isnot(None), UserEvent.created_at >= since)
            .distinct()
        )
    ).scalars().all()

    badges_awarded = 0
    for user_id in user_ids:
        await update_streak(db, user_id)
        badges_awarded += len(await check_badges(db, user_id))

    rewarded = await process_pending_conversions(db)
    return {"users_processed": len(user_ids), "badges_awarded": badges_awarded, "referrals_rewarded": rewarded}
