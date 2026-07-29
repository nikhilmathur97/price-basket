"""Competitor Intelligence AI — trend insights derived from existing PriceHistory data."""
import uuid
from datetime import date as date_, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class CompetitorInsight(Base):
    __tablename__ = "competitor_insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platforms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "cheapest_share" | "price_trend" | "stockout_pattern"
    insight_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # Null = platform-wide insight; set = insight scoped to one product.
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True
    )
    period_start: Mapped[date_] = mapped_column(Date, nullable=False)
    period_end: Mapped[date_] = mapped_column(Date, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    platform = relationship("Platform")

    def __repr__(self) -> str:
        return f"<CompetitorInsight {self.insight_type} platform={self.platform_id}>"
