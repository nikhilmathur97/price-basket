"""Re-add unique index on users.mobile_number — corrected requirement: mobile
number is mandatory and unique at signup (like email), no OTP verification
required. Supersedes 015, which incorrectly dropped uniqueness.

Revision ID: 016_mobile_number_unique
Revises: 015_drop_mobile_number_unique
Create Date: 2026-08-02
"""
from alembic import op

revision = "016_mobile_number_unique"
down_revision = "015_drop_mobile_number_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_mobile_number")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile_number "
        "ON users (mobile_number) WHERE mobile_number IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_mobile_number")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_mobile_number ON users (mobile_number)")
