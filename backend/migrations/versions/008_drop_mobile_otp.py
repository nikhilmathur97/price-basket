"""Drop mobile-OTP auth infrastructure — email+password is now the sole auth flow.

mobile_number / mobile_verified stay on users as an optional contact field;
only the OTP verification table and its purpose enum are removed.

Revision ID: 008_drop_mobile_otp
Revises: 007_contact_queries
Create Date: 2026-07-18
"""
from alembic import op

revision = "008_drop_mobile_otp"
down_revision = "007_contact_queries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS otp_verifications")
    op.execute("DROP TYPE IF EXISTS otp_purpose_enum")


def downgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "  CREATE TYPE otp_purpose_enum AS ENUM "
        "    ('signup', 'forgot_password', 'change_mobile'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$"
    )
    op.execute("""
        CREATE TABLE IF NOT EXISTS otp_verifications (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            mobile_number   VARCHAR(20)  NOT NULL,
            otp_hash        VARCHAR(255) NOT NULL,
            purpose         otp_purpose_enum NOT NULL,
            expires_at      TIMESTAMPTZ  NOT NULL,
            attempt_count   INTEGER      NOT NULL DEFAULT 0,
            is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_otp_verifications_mobile_number "
        "ON otp_verifications (mobile_number)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_otp_verifications_expires_at "
        "ON otp_verifications (expires_at)"
    )
