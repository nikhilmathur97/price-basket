"""Create referral + loyalty tables

Revision ID: 013_referral_loyalty
Revises: 012_review_management
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "013_referral_loyalty"
down_revision = "012_review_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "referral_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("code", sa.String(20), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_referral_codes_code", "referral_codes", ["code"])

    op.create_table(
        "referral_conversions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("referrer_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("rewarded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_referral_conversions_referrer_user_id", "referral_conversions", ["referrer_user_id"])

    op.create_table(
        "loyalty_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("coins_balance", sa.Integer, nullable=False, server_default="0"),
        sa.Column("current_streak_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("longest_streak_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        "loyalty_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delta", sa.Integer, nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_loyalty_transactions_user_id", "loyalty_transactions", ["user_id"])

    op.create_table(
        "loyalty_badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("badge_code", sa.String(50), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "badge_code", name="uq_loyalty_badges_user_badge"),
    )
    op.create_index("ix_loyalty_badges_user_id", "loyalty_badges", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_loyalty_badges_user_id", table_name="loyalty_badges")
    op.drop_table("loyalty_badges")
    op.drop_index("ix_loyalty_transactions_user_id", table_name="loyalty_transactions")
    op.drop_table("loyalty_transactions")
    op.drop_table("loyalty_accounts")
    op.drop_index("ix_referral_conversions_referrer_user_id", table_name="referral_conversions")
    op.drop_table("referral_conversions")
    op.drop_index("ix_referral_codes_code", table_name="referral_codes")
    op.drop_table("referral_codes")
