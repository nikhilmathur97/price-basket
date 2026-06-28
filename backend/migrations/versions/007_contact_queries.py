"""007 — Create contact_queries table for customer support messages."""
from alembic import op

revision = "007_contact_queries"
down_revision = "006_mobile_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_query_status_enum') THEN
                CREATE TYPE contact_query_status_enum AS ENUM ('new', 'read', 'replied');
            END IF;
        END
        $$;
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS contact_queries (
            id UUID PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255),
            mobile VARCHAR(20),
            subject VARCHAR(120) NOT NULL,
            message TEXT NOT NULL,
            status contact_query_status_enum NOT NULL DEFAULT 'new',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_contact_queries_created_at ON contact_queries (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_contact_queries_status ON contact_queries (status)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS contact_queries")
    op.execute("DROP TYPE IF EXISTS contact_query_status_enum")
