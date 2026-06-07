from __future__ import annotations
"""
Auth router — register, login, refresh, logout.
All tokens use httpOnly cookies for XSS protection, with CSRF header requirement.
"""
import uuid as _uuid
from datetime import timezone, datetime
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError
from jose import jwt as _jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import TokenResponse, UserLogin, UserRegister, UserOut, ForgotPasswordRequest, ResetPasswordRequest
from app.services.auth_service import (
    create_access_token,
    create_refresh_token_str,
    get_user_by_email,
    get_user_by_id,
    create_user,
    rotate_refresh_token,
    revoke_all_user_tokens,
    store_refresh_token,
    verify_password,
    hash_password,
    create_reset_token,
    decode_reset_token,
    send_reset_email,
)
from app.config import settings
from app.middleware.auth_middleware import get_current_user
from app.models.user import User

router = APIRouter()

REFRESH_COOKIE = "pb_refresh_token"
COOKIE_KWARGS = {
    "httponly": True,
    "secure": settings.is_production,
    # none required for cross-origin cookie (frontend on pricebasket.in,
    # backend on api.test2.pricebasket.in)
    "samesite": "none" if settings.is_production else "lax",
    "max_age": settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserRegister,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = await create_user(db, body.email, body.password, body.full_name)

    raw_refresh = create_refresh_token_str()
    await store_refresh_token(
        db, user.id, raw_refresh,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    access = create_access_token(user.id, user.is_admin)
    response.set_cookie(REFRESH_COOKIE, raw_refresh, **COOKIE_KWARGS)

    return TokenResponse(
        access_token=access,
        refresh_token=raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, body.email)
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)

    raw_refresh = create_refresh_token_str()
    await store_refresh_token(
        db, user.id, raw_refresh,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    access = create_access_token(user.id, user.is_admin)
    response.set_cookie(REFRESH_COOKIE, raw_refresh, **COOKIE_KWARGS)

    return TokenResponse(
        access_token=access,
        refresh_token=raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    cookie_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE),
):
    # Accept from cookie OR Authorization header (mobile clients)
    raw = cookie_token or request.headers.get("X-Refresh-Token")
    if not raw:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    result = await rotate_refresh_token(
        db, raw,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    if not result:
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    user, new_raw = result
    access = create_access_token(user.id, user.is_admin)
    response.set_cookie(REFRESH_COOKIE, new_raw, **COOKIE_KWARGS)

    return TokenResponse(
        access_token=access,
        refresh_token=new_raw,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await revoke_all_user_tokens(db, current_user.id)
    response.delete_cookie(REFRESH_COOKIE)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    # Always return 204 regardless — prevents email enumeration attacks.
    user = await get_user_by_email(db, body.email)
    if not user or not user.hashed_password or not user.is_active:
        return
    token = create_reset_token(user)
    await send_reset_email(user.email, token)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = _jwt.decode(body.token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid reset link")

    try:
        user_id = _uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid reset link")

    user = await get_user_by_id(db, user_id)
    if not user or not user.hashed_password or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if not decode_reset_token(body.token, user):
        raise HTTPException(status_code=400, detail="Reset link already used or expired")

    user.hashed_password = hash_password(body.new_password)
    await revoke_all_user_tokens(db, user.id)
    await db.commit()
