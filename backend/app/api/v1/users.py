"""Users API — profile management."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas import FCMTokenIn, UserOut, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.flush()
    return current_user


@router.post("/fcm-token", status_code=204)
async def register_fcm_token(
    body: FCMTokenIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or update this device's FCM token for push notifications."""
    current_user.fcm_token = body.token
    await db.flush()
    return None


@router.delete("/fcm-token", status_code=204)
async def clear_fcm_token(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear the stored FCM token (e.g. on logout / notifications disabled)."""
    current_user.fcm_token = None
    await db.flush()
    return None
