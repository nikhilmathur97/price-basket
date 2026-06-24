"""SQLAlchemy models for the PriceBasket marketing agent system."""
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class MarketingContent(Base):
    __tablename__ = "marketing_content"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    inputs: Mapped[Optional[dict]] = mapped_column(JSONB)
    tone: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    utm_link: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<MarketingContent {self.agent_id}:{self.id}>"


class MarketingCampaign(Base):
    __tablename__ = "marketing_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    theme: Mapped[Optional[str]] = mapped_column(Text)
    goal: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    duration_days: Mapped[Optional[int]] = mapped_column(Integer)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    plan_content: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MarketingAnalytics(Base):
    __tablename__ = "marketing_analytics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_value: Mapped[Optional[int]] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    recorded_at: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MarketingGoal(Base):
    __tablename__ = "marketing_goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    month: Mapped[date] = mapped_column(Date, nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_value: Mapped[int] = mapped_column(Integer, nullable=False)
    current_value: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("month", "platform", "metric_name", name="uq_mktg_goals_month_platform_metric"),
    )


class MarketingSchedule(Base):
    __tablename__ = "marketing_schedule"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_posted: Mapped[bool] = mapped_column(Boolean, default=False)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
