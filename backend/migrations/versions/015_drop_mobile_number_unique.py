"""Drop unique index on users.mobile_number — it's an optional contact field, not a login identifier, so duplicates across accounts must be allowed.

Revision ID: 015_drop_mobile_number_unique
Revises: 014_organic_growth_agent
Create Date: 2026-08-02
"""
from alembic import op

revision = "015_drop_mobile_number_unique"
down_revision = "014_organic_growth_agent"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_mobile_number")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_mobile_number ON users (mobile_number)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_mobile_number")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile_number "
        "ON users (mobile_number) WHERE mobile_number IS NOT NULL"
    )
