"""add fcm_token column to users

Revision ID: 003_user_fcm_token
Revises: 002_performance_indexes
Create Date: 2026-06-04
"""
from alembic import op

revision = "003_user_fcm_token"
down_revision = "002_performance_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS fcm_token")
