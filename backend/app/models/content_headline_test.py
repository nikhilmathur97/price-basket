"""Headline A/B variant generator — AI drafts 3 titles, admin picks the winner.

No automated click-through winner selection: blog pageviews aren't tracked in
UserEvent today, so there's no real signal to auto-decide from. This is an
honest limitation, not an oversight — see plan notes.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class HeadlineVariant(Base):
    __tablename__ = "content_headline_tests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    variants: Mapped[List[str]] = mapped_column(JSONB, nullable=False)
    chosen_variant: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<HeadlineVariant {self.post_slug}>"
