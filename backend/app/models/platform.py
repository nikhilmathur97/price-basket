from typing import Optional
"""Platform model — represents a quick-commerce partner (Blinkit, Zepto, etc.)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Platform(Base):
    __tablename__ = "platforms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    base_url: Mapped[Optional[str]] = mapped_column(Text)
    color_hex: Mapped[Optional[str]] = mapped_column(String(7))   # e.g. "#0C831F" for Blinkit

    # Delivery info
    avg_delivery_minutes: Mapped[int] = mapped_column(Integer, default=15)
    min_order_amount: Mapped[float] = mapped_column(default=0.0)
    delivery_fee: Mapped[float] = mapped_column(default=0.0)
    free_delivery_threshold: Mapped[Optional[float]] = mapped_column()

    # Operational state
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    scraping_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    api_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    health_check_url: Mapped[Optional[str]] = mapped_column(Text)
    last_successful_scrape: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    scrape_failure_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    prices = relationship("PlatformPrice", back_populates="platform", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Platform {self.slug}>"
