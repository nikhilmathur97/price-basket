"""add user_events analytics table

Revision ID: 001_user_events
Revises: 6e743352bf64
Create Date: 2026-05-20
"""
from alembic import op

revision = "001_user_events"
down_revision = "6e743352bf64"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop any incomplete/broken table from previous failed migration attempts
    op.execute("DROP TABLE IF EXISTS user_events CASCADE")
    op.execute("DROP TYPE IF EXISTS user_event_type_enum CASCADE")

    op.execute("""
        CREATE TYPE user_event_type_enum AS ENUM (
            'product_view', 'cart_add', 'cart_remove',
            'platform_redirect', 'search', 'checkout_start'
        )
    """)
    op.execute("""
        CREATE TABLE user_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type user_event_type_enum NOT NULL,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            client_id VARCHAR(64) NOT NULL,
            session_id VARCHAR(128),
            product_id UUID REFERENCES products(id) ON DELETE SET NULL,
            platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
            price_shown NUMERIC(10, 2),
            cart_item_count INTEGER,
            search_query VARCHAR(500),
            referrer_page VARCHAR(100),
            redirect_url TEXT,
            ip_hash VARCHAR(64),
            country_code VARCHAR(2),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_user_events_event_type  ON user_events (event_type)")
    op.execute("CREATE INDEX ix_user_events_user_id     ON user_events (user_id)")
    op.execute("CREATE INDEX ix_user_events_client_id   ON user_events (client_id)")
    op.execute("CREATE INDEX ix_user_events_product_id  ON user_events (product_id)")
    op.execute("CREATE INDEX ix_user_events_platform_id ON user_events (platform_id)")
    op.execute("CREATE INDEX ix_user_events_created_at  ON user_events (created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_events")
    op.execute("DROP TYPE IF EXISTS user_event_type_enum")

