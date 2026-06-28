"""OTP generation, storage, and validation service."""
import hashlib
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.otp import OTPVerification

log = structlog.get_logger(__name__)

OTP_EXPIRE_MINUTES = 5
MAX_ATTEMPTS = 5
MAX_REQUESTS_PER_15_MIN = 3

OTPPurpose = Literal["signup", "forgot_password", "change_mobile"]


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _hash_otp(otp: str, mobile_number: str) -> str:
    # Salt with mobile + secret so the same OTP on a different number has a different hash.
    return hashlib.sha256(
        f"{mobile_number}:{otp}:{settings.SECRET_KEY}".encode()
    ).hexdigest()


async def check_rate_limit(db: AsyncSession, mobile_number: str) -> bool:
    """Returns True (allowed) or False (rate limit exceeded)."""
    window_start = datetime.now(timezone.utc) - timedelta(minutes=15)
    result = await db.execute(
        select(func.count())
        .select_from(OTPVerification)
        .where(
            OTPVerification.mobile_number == mobile_number,
            OTPVerification.created_at >= window_start,
        )
    )
    return (result.scalar_one() or 0) < MAX_REQUESTS_PER_15_MIN


async def create_otp(
    db: AsyncSession,
    mobile_number: str,
    purpose: OTPPurpose,
) -> str:
    """Create and persist an OTP record. Returns the plain OTP for sending via SMS."""
    otp = _generate_otp()
    record = OTPVerification(
        mobile_number=mobile_number,
        otp_hash=_hash_otp(otp, mobile_number),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    )
    db.add(record)
    await db.flush()
    log.info("otp_created", mobile_suffix=mobile_number[-4:], purpose=purpose)
    return otp


async def verify_otp(
    db: AsyncSession,
    mobile_number: str,
    otp: str,
    purpose: OTPPurpose,
) -> tuple[bool, str]:
    """
    Verify an OTP. Returns (success, error_message).
    On success, marks the record as verified so it cannot be reused.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OTPVerification)
        .where(
            OTPVerification.mobile_number == mobile_number,
            OTPVerification.purpose == purpose,
            OTPVerification.is_verified.is_(False),
            OTPVerification.expires_at > now,
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if not record:
        return False, "OTP expired or not found. Please request a new one."

    if record.attempt_count >= MAX_ATTEMPTS:
        return False, "Too many incorrect attempts. Please request a new OTP."

    if _hash_otp(otp, mobile_number) != record.otp_hash:
        record.attempt_count += 1
        await db.flush()
        remaining = MAX_ATTEMPTS - record.attempt_count
        if remaining <= 0:
            return False, "Too many incorrect attempts. Please request a new OTP."
        return False, f"Incorrect OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining."

    record.is_verified = True
    await db.flush()
    return True, ""


async def check_otp_already_verified(
    db: AsyncSession,
    mobile_number: str,
    purpose: OTPPurpose,
    within_minutes: int = 10,
) -> bool:
    """
    Returns True if a verified OTP for this mobile+purpose exists within the time window.
    Used by reset-password to confirm the forgot-password OTP was already verified.
    """
    window_start = datetime.now(timezone.utc) - timedelta(minutes=within_minutes)
    result = await db.execute(
        select(func.count())
        .select_from(OTPVerification)
        .where(
            OTPVerification.mobile_number == mobile_number,
            OTPVerification.purpose == purpose,
            OTPVerification.is_verified.is_(True),
            OTPVerification.created_at >= window_start,
        )
    )
    return (result.scalar_one() or 0) > 0
