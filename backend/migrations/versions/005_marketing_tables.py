"""Create marketing tables (content, campaigns, analytics, goals, schedule)

Revision ID: 005_marketing_tables
Revises: 004_platform_price_unique
Create Date: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005_marketing_tables"
down_revision = "004_platform_price_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── marketing_content ────────────────────────────────────────────────────
    op.create_table(
        "marketing_content",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("agent_id", sa.String(50), nullable=False),
        sa.Column("platform", sa.String(100), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("inputs", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tone", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("utm_link", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_marketing_content_agent_id", "marketing_content", ["agent_id"])
    op.create_index("ix_marketing_content_status", "marketing_content", ["status"])

    # ── marketing_campaigns ──────────────────────────────────────────────────
    op.create_table(
        "marketing_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("theme", sa.Text, nullable=True),
        sa.Column("goal", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("duration_days", sa.Integer, nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("plan_content", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── marketing_analytics ──────────────────────────────────────────────────
    op.create_table(
        "marketing_analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("content_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("platform", sa.String(100), nullable=False),
        sa.Column("metric_name", sa.String(100), nullable=False),
        sa.Column("metric_value", sa.Integer, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("recorded_at", sa.Date, server_default=sa.func.current_date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── marketing_goals ──────────────────────────────────────────────────────
    op.create_table(
        "marketing_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("month", sa.Date, nullable=False),
        sa.Column("platform", sa.String(100), nullable=False),
        sa.Column("metric_name", sa.String(100), nullable=False),
        sa.Column("target_value", sa.Integer, nullable=False),
        sa.Column("current_value", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("month", "platform", "metric_name", name="uq_mktg_goals_month_platform_metric"),
    )

    # ── marketing_schedule ───────────────────────────────────────────────────
    op.create_table(
        "marketing_schedule",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("content_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("platform", sa.String(100), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("reminder_sent", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_posted", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_marketing_schedule_scheduled_for", "marketing_schedule", ["scheduled_for"])


def downgrade() -> None:
    op.drop_index("ix_marketing_schedule_scheduled_for", table_name="marketing_schedule")
    op.drop_table("marketing_schedule")
    op.drop_table("marketing_goals")
    op.drop_table("marketing_analytics")
    op.drop_table("marketing_campaigns")
    op.drop_index("ix_marketing_content_status", table_name="marketing_content")
    op.drop_index("ix_marketing_content_agent_id", table_name="marketing_content")
    op.drop_table("marketing_content")
