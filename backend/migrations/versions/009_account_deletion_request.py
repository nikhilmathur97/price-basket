"""009 — Add deletion_requested_at to users for self-service account deletion requests.

Users request deletion via the profile page; this flags the account for admin
review instead of deleting immediately. Admin panel surfaces the flag and the
existing DELETE /admin/users/{id} endpoint performs the actual erasure.

Revision ID: 009_account_deletion_request
Revises: 008_drop_mobile_otp
Create Date: 2026-07-26
"""
from alembic import op

revision = "009_account_deletion_request"
down_revision = "008_drop_mobile_otp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_users_deletion_requested_at "
        "ON users (deletion_requested_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_deletion_requested_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS deletion_requested_at")
