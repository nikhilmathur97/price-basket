"""Mobile number authentication — add mobile_number + mobile_verified to users; create otp_verifications.

Revision ID: 006_mobile_auth
Revises: 005_marketing_tables
Create Date: 2026-06-28
"""
from alembic import op

revision = "006_mobile_auth"
down_revision = "005_marketing_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make email nullable — new users may register with mobile only
    op.execute("ALTER TABLE users ALTER COLUMN email DROP NOT NULL")

    # Mobile auth fields on users
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20)")
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_verified "
        "BOOLEAN NOT NULL DEFAULT FALSE"
    )

    # Partial unique index: allows multiple NULLs (pre-existing email-only users)
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile_number "
        "ON users (mobile_number) WHERE mobile_number IS NOT NULL"
    )

    # OTP purpose enum
    op.execute(
        "DO $$ BEGIN "
        "  CREATE TYPE otp_purpose_enum AS ENUM "
        "    ('signup', 'forgot_password', 'change_mobile'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$"
    )

    # OTP verifications table
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


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS otp_verifications")
    op.execute("DROP INDEX IF EXISTS ix_users_mobile_number")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS mobile_verified")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS mobile_number")
    op.execute("ALTER TABLE users ALTER COLUMN email SET NOT NULL")
    op.execute("DROP TYPE IF EXISTS otp_purpose_enum")
