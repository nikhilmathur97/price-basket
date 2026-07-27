"""Referral + Loyalty AI — referral codes/conversions and coins/streaks/badges."""
import uuid
from datetime import date as date_, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class ReferralCode(Base):
    __tablename__ = "referral_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReferralConversion(Base):
    __tablename__ = "referral_conversions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    referred_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # "pending" | "rewarded"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    rewarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class LoyaltyAccount(Base):
    __tablename__ = "loyalty_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    coins_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_activity_date: Mapped[Optional[date_]] = mapped_column(Date)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # "referral_bonus" | "daily_streak" | "badge_earned"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LoyaltyBadge(Base):
    __tablename__ = "loyalty_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_code", name="uq_loyalty_badges_user_badge"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    badge_code: Mapped[str] = mapped_column(String(50), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
