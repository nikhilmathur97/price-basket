"""Create reviews table

Revision ID: 012_review_management
Revises: 011_competitor_intelligence
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "012_review_management"
down_revision = "011_competitor_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("author_name", sa.String(255), nullable=True),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("review_text", sa.Text, nullable=False),
        sa.Column("review_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sentiment", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column("ai_reply_draft", sa.Text, nullable=True),
        sa.Column("posted_reply", sa.Text, nullable=True),
        sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("source", "external_id", name="uq_reviews_source_external_id"),
    )
    op.create_index("ix_reviews_source", "reviews", ["source"])
    op.create_index("ix_reviews_status", "reviews", ["status"])


def downgrade() -> None:
    op.drop_index("ix_reviews_status", table_name="reviews")
    op.drop_index("ix_reviews_source", table_name="reviews")
    op.drop_table("reviews")
