"""
Referral AI
===========
Referral code generation/redemption. Rewarding happens only once the
referred user completes a real action (first platform_redirect UserEvent)
— not at signup — to avoid reward farming with throwaway accounts.
"""
from __future__ import annotations

import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.analytics import UserEvent
from app.models.loyalty import ReferralCode, ReferralConversion

log = structlog.get_logger(__name__)

_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_code_str(length: int = 8) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


async def get_or_create_code(db: AsyncSession, user_id: uuid.UUID) -> ReferralCode:
    existing = (
        await db.execute(select(ReferralCode).where(ReferralCode.user_id == user_id))
    ).scalar_one_or_none()
    if existing:
        return existing

    for _ in range(5):  # collision retry
        code = _generate_code_str()
        clash = (await db.execute(select(ReferralCode).where(ReferralCode.code == code))).scalar_one_or_none()
        if not clash:
            referral_code = ReferralCode(user_id=user_id, code=code)
            db.add(referral_code)
            await db.flush()
            return referral_code
    raise RuntimeError("Could not generate a unique referral code")


async def redeem_code(db: AsyncSession, code: str, new_user_id: uuid.UUID) -> Optional[ReferralConversion]:
    """Called at signup with an optional referral code. Additive — no-op if
    the code is missing/invalid/self-referral. Does not reward yet."""
    if not code:
        return None
    referral_code = (
        await db.execute(select(ReferralCode).where(ReferralCode.code == code.upper()))
    ).scalar_one_or_none()
    if not referral_code or referral_code.user_id == new_user_id:
        return None

    already = (
        await db.execute(select(ReferralConversion).where(ReferralConversion.referred_user_id == new_user_id))
    ).scalar_one_or_none()
    if already:
        return already

    conversion = ReferralConversion(
        referrer_user_id=referral_code.user_id,
        referred_user_id=new_user_id,
        status="pending",
    )
    db.add(conversion)
    await db.flush()
    return conversion


async def reward_conversion(db: AsyncSession, conversion: ReferralConversion) -> None:
    from app.services.loyalty_service import award_coins  # avoid circular import at module load

    conversion.status = "rewarded"
    conversion.rewarded_at = datetime.now(timezone.utc)
    await award_coins(db, conversion.referrer_user_id, settings.REFERRAL_BONUS_COINS, "referral_bonus")
    await award_coins(db, conversion.referred_user_id, settings.REFERRAL_BONUS_COINS, "referral_bonus")


async def process_pending_conversions(db: AsyncSession) -> int:
    """Reward any pending conversion whose referred user has a real
    platform_redirect event — called periodically by loyalty_worker."""
    pending = (
        await db.execute(select(ReferralConversion).where(ReferralConversion.status == "pending"))
    ).scalars().all()

    rewarded = 0
    for conversion in pending:
        has_redirect = (
            await db.execute(
                select(UserEvent.id)
                .where(
                    UserEvent.user_id == conversion.referred_user_id,
                    UserEvent.event_type == "platform_redirect",
                )
                .limit(1)
            )
        ).scalar_one_or_none()
        if has_redirect:
            await reward_conversion(db, conversion)
            rewarded += 1
    return rewarded
