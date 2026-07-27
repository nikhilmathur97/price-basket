"""Create competitor_insights table

Revision ID: 011_competitor_intelligence
Revises: 010_executive_reports
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "011_competitor_intelligence"
down_revision = "010_executive_reports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "competitor_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("platform_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("platforms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("insight_type", sa.String(50), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=True),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_competitor_insights_platform_id", "competitor_insights", ["platform_id"])
    op.create_index("ix_competitor_insights_insight_type", "competitor_insights", ["insight_type"])
    op.create_index("ix_competitor_insights_product_id", "competitor_insights", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_competitor_insights_product_id", table_name="competitor_insights")
    op.drop_index("ix_competitor_insights_insight_type", table_name="competitor_insights")
    op.drop_index("ix_competitor_insights_platform_id", table_name="competitor_insights")
    op.drop_table("competitor_insights")
