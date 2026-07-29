"""Create executive_reports table

Revision ID: 010_executive_reports
Revises: 009_account_deletion_request
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "010_executive_reports"
down_revision = "009_account_deletion_request"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "executive_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("report_date", sa.Date, nullable=False),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("narrative", sa.Text, nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_executive_reports_period", "executive_reports", ["period"])
    op.create_index("ix_executive_reports_report_date", "executive_reports", ["report_date"])


def downgrade() -> None:
    op.drop_index("ix_executive_reports_report_date", table_name="executive_reports")
    op.drop_index("ix_executive_reports_period", table_name="executive_reports")
    op.drop_table("executive_reports")
