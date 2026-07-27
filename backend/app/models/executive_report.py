"""Executive Reports AI — daily/weekly/monthly business summaries for admins."""
import uuid
from datetime import date as date_, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class ExecutiveReport(Base):
    __tablename__ = "executive_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # "daily" | "weekly" | "monthly"
    report_date: Mapped[date_] = mapped_column(Date, nullable=False, index=True)
    metrics: Mapped[dict] = mapped_column(JSONB, nullable=False)
    narrative: Mapped[Optional[str]] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<ExecutiveReport {self.period}:{self.report_date}>"
