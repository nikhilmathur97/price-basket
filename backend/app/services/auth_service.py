"""
Auth service — JWT creation/validation, password hashing, token rotation.
"""
import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
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
    to_encode["exp"] = datetime.now(UTC) + expires_delta
    to_encode["iat"] = datetime.now(UTC)
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
        expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
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
            RefreshToken.expires_at > datetime.now(UTC),
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
