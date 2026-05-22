"""
Price models:
  - PlatformPrice  : current price per product per platform
  - PriceHistory   : historical time-series for analytics / ML
  - PriceAlert     : user-configured price drop notifications
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class PlatformPrice(Base):
    """Latest known price for a product on a specific platform."""

    __tablename__ = "platform_prices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platforms.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Pricing
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    original_price: Mapped[float | None] = mapped_column(Numeric(10, 2))   # MRP
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    discount_label: Mapped[str | None] = mapped_column(String(100))         # e.g. "20% OFF"

    # Availability
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    stock_count: Mapped[int | None] = mapped_column(Integer)

    # Platform-specific identifiers (for deep-link checkout)
    platform_product_id: Mapped[str | None] = mapped_column(String(255))
    platform_product_url: Mapped[str | None] = mapped_column(Text)
    platform_image_url: Mapped[str | None] = mapped_column(Text)

    # Delivery
    delivery_time_minutes: Mapped[int | None] = mapped_column(Integer)

    # Freshness
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True
    )
    source: Mapped[str] = mapped_column(String(20), default="scrape")  # "scrape" | "api"

    # Relationships
    product = relationship("Product", back_populates="platform_prices")
    platform = relationship("Platform", back_populates="prices")

    def __repr__(self) -> str:
        return f"<PlatformPrice product={self.product_id} platform={self.platform_id} price={self.price}>"


class PriceHistory(Base):
    """Time-series price data for trend analysis and ML predictions."""

    __tablename__ = "price_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platforms.id", ondelete="CASCADE"), nullable=False
    )
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    product = relationship("Product", back_populates="price_history")


class PriceAlert(Base):
    """User-configured alert: notify when price drops below threshold."""

    __tablename__ = "price_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="price_alerts")
    product = relationship("Product", back_populates="price_alerts")
