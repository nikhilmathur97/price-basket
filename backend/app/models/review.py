"""Review Management AI — Google/Play Store/on-site reviews, AI-drafted replies."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_reviews_source_external_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # "google" | "playstore" | "onsite"
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    author_name: Mapped[Optional[str]] = mapped_column(String(255))
    rating: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5, nullable for text-only onsite feedback
    review_text: Mapped[str] = mapped_column(Text, nullable=False)
    review_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sentiment: Mapped[Optional[str]] = mapped_column(String(20))  # "positive" | "neutral" | "negative"
    # "new" | "draft_ready" | "approved" | "posted" | "escalated"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new", index=True)
    ai_reply_draft: Mapped[Optional[str]] = mapped_column(Text)
    posted_reply: Mapped[Optional[str]] = mapped_column(Text)
    replied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Review {self.source}:{self.external_id} status={self.status}>"
