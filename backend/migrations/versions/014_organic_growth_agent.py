"""Create content_headline_tests table

Revision ID: 014_organic_growth_agent
Revises: 013_referral_loyalty
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "014_organic_growth_agent"
down_revision = "013_referral_loyalty"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_headline_tests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("post_slug", sa.String(255), nullable=False),
        sa.Column("variants", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("chosen_variant", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_content_headline_tests_post_slug", "content_headline_tests", ["post_slug"])


def downgrade() -> None:
    op.drop_index("ix_content_headline_tests_post_slug", table_name="content_headline_tests")
    op.drop_table("content_headline_tests")
