"""
Auth service — JWT creation/validation, password hashing, token rotation.
"""
import hashlib
import secrets
import uuid
from datetime import timezone, datetime, timedelta
from typing import Optional

import bcrypt as _bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.cart import RefreshToken
from app.models.user import User


# ── Password helpers ─────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _create_token(payload: dict, expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    to_encode["iat"] = datetime.now(timezone.utc)
    to_encode["jti"] = str(uuid.uuid4())
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID, is_admin: bool = False) -> str:
    return _create_token(
        {"sub": str(user_id), "type": "access", "admin": is_admin},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token_str() -> str:
    """Generate a cryptographically secure opaque refresh token."""
    return secrets.token_urlsafe(64)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token. Raises JWTError on failure."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Invalid token type")
    return payload


def create_reset_token(user: "User") -> str:
    # ph is a fingerprint of the current hashed password — makes the token
    # single-use: once the password changes, ph mismatches and the token is invalid.
    ph = hashlib.sha256(user.hashed_password.encode()).hexdigest()[:16]
    return _create_token(
        {"sub": str(user.id), "type": "password_reset", "ph": ph},
        timedelta(hours=1),
    )


def decode_reset_token(token: str, user: "User") -> bool:
    """Returns True if token is valid and matches the given user's current password fingerprint."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return False
    if payload.get("type") != "password_reset":
        return False
    if payload.get("sub") != str(user.id):
        return False
    ph = hashlib.sha256(user.hashed_password.encode()).hexdigest()[:16]
    return payload.get("ph") == ph


async def send_reset_email(to_email: str, reset_token: str) -> None:
    import smtplib
    import asyncio
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    import structlog

    log = structlog.get_logger(__name__)
    reset_url = f"{settings.SITE_URL}/auth/reset-password?token={reset_token}"

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        log.warning("smtp_not_configured_reset_link", url=reset_url)
        return

    def _send() -> None:
        from email.utils import parseaddr
        smtp_from = settings.SMTP_FROM or settings.SMTP_USER
        # Extract bare address for envelope sender (DMARC SPF alignment)
        envelope_from = parseaddr(smtp_from)[1] or settings.SMTP_USER

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your PriceBasket password"
        msg["From"] = smtp_from
        msg["To"] = to_email
        body = f"""
        <html><body style="font-family:Arial,sans-serif;padding:20px;max-width:480px">
          <h2 style="color:#0C831F">Reset your password</h2>
          <p>We received a request to reset your PriceBasket password.</p>
          <p>Click the button below. This link expires in <strong>1 hour</strong>.</p>
          <p style="margin:24px 0">
            <a href="{reset_url}"
               style="background:#0C831F;color:white;padding:12px 24px;
                      text-decoration:none;border-radius:8px;font-weight:bold">
              Reset Password
            </a>
          </p>
          <p style="color:#666;font-size:13px">
            If you didn't request this, ignore this email — your password won't change.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">PriceBasket · pricebasket.in</p>
        </body></html>
        """
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(envelope_from, to_email, msg.as_string())

    try:
        await asyncio.to_thread(_send)
        log.info("reset_email_sent", to=to_email)
    except Exception as exc:
        log.error("reset_email_failed", to=to_email, error=str(exc))


# ── Database operations ───────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, email: str, password: str, full_name: str) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    return user


async def store_refresh_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    raw_token: str,
    user_agent: Optional[str],
    ip_address: Optional[str],
) -> None:
    rt = RefreshToken(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(rt)
    await db.flush()


async def rotate_refresh_token(
    db: AsyncSession,
    old_raw_token: str,
    user_agent: Optional[str],
    ip_address: Optional[str],
) -> Optional[tuple[User, str]]:
    """
    Validate old refresh token, revoke it, issue a new one.
    Returns (user, new_raw_token) or None if token is invalid/expired.
    """
    old_hash = _hash_token(old_raw_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == old_hash,
            RefreshToken.is_revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        return None

    # Revoke old token
    rt.is_revoked = True

    user = await get_user_by_id(db, rt.user_id)
    if not user or not user.is_active:
        return None

    new_raw = create_refresh_token_str()
    await store_refresh_token(db, user.id, new_raw, user_agent, ip_address)
    return user, new_raw


async def revoke_all_user_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,  # noqa: E712
        )
    )
    for token in result.scalars():
        token.is_revoked = True
