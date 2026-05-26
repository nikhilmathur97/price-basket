"""init

Revision ID: 6e743352bf64
Revises: 
Create Date: 2026-05-12 17:37:17.999040

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e743352bf64'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ── Enums ─────────────────────────────────────────────────────────────────
    op.execute("DROP TYPE IF EXISTS oauth_provider_enum CASCADE")
    op.execute("CREATE TYPE oauth_provider_enum AS ENUM ('google', 'facebook')")

    # ── categories ────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE categories (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug        VARCHAR(100) NOT NULL UNIQUE,
            name        VARCHAR(100) NOT NULL,
            icon        VARCHAR(50),
            image_url   TEXT,
            display_order INTEGER NOT NULL DEFAULT 0,
            is_active   BOOLEAN NOT NULL DEFAULT TRUE,
            parent_id   UUID REFERENCES categories(id),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_categories_slug ON categories (slug)")

    # ── platforms ─────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE platforms (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug                    VARCHAR(50)  NOT NULL UNIQUE,
            name                    VARCHAR(100) NOT NULL,
            logo_url                TEXT,
            base_url                TEXT,
            color_hex               VARCHAR(7),
            avg_delivery_minutes    INTEGER NOT NULL DEFAULT 15,
            min_order_amount        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            delivery_fee            DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            free_delivery_threshold DOUBLE PRECISION,
            is_active               BOOLEAN NOT NULL DEFAULT TRUE,
            scraping_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
            api_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
            health_check_url        TEXT,
            last_successful_scrape  TIMESTAMPTZ,
            scrape_failure_count    INTEGER NOT NULL DEFAULT 0,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_platforms_slug ON platforms (slug)")

    # ── users ─────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE users (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email                VARCHAR(255) NOT NULL UNIQUE,
            hashed_password      VARCHAR(255),
            full_name            VARCHAR(255),
            phone                VARCHAR(20),
            avatar_url           TEXT,
            city                 VARCHAR(100),
            pincode              VARCHAR(10),
            latitude             DOUBLE PRECISION,
            longitude            DOUBLE PRECISION,
            is_active            BOOLEAN NOT NULL DEFAULT TRUE,
            is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
            is_admin             BOOLEAN NOT NULL DEFAULT FALSE,
            oauth_provider       oauth_provider_enum,
            oauth_id             VARCHAR(255),
            notification_email   BOOLEAN NOT NULL DEFAULT TRUE,
            notification_push    BOOLEAN NOT NULL DEFAULT TRUE,
            preferred_platforms  TEXT,
            created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_login_at        TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX ix_users_email ON users (email)")

    # ── products ──────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE products (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug           VARCHAR(255) NOT NULL UNIQUE,
            name           VARCHAR(255) NOT NULL,
            brand          VARCHAR(100),
            description    TEXT,
            image_url      TEXT,
            thumbnail_url  TEXT,
            category_id    UUID REFERENCES categories(id),
            unit           VARCHAR(50),
            weight_grams   INTEGER,
            barcode        VARCHAR(50),
            tags           TEXT[],
            is_active      BOOLEAN NOT NULL DEFAULT TRUE,
            is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_products_slug    ON products (slug)")
    op.execute("CREATE INDEX ix_products_name    ON products (name)")
    op.execute("CREATE INDEX ix_products_barcode ON products (barcode)")

    # ── platform_prices ───────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE platform_prices (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id           UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
            platform_id          UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
            price                NUMERIC(10, 2) NOT NULL,
            original_price       NUMERIC(10, 2),
            discount_percent     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            discount_label       VARCHAR(100),
            is_available         BOOLEAN NOT NULL DEFAULT TRUE,
            stock_count          INTEGER,
            platform_product_id  VARCHAR(255),
            platform_product_url TEXT,
            platform_image_url   TEXT,
            delivery_time_minutes INTEGER,
            last_updated         TIMESTAMPTZ NOT NULL DEFAULT now(),
            source               VARCHAR(20)  NOT NULL DEFAULT 'scrape'
        )
    """)
    op.execute("CREATE INDEX ix_platform_prices_product_id  ON platform_prices (product_id)")
    op.execute("CREATE INDEX ix_platform_prices_platform_id ON platform_prices (platform_id)")
    op.execute("CREATE INDEX ix_platform_prices_last_updated ON platform_prices (last_updated)")

    # ── price_history ─────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE price_history (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id   UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
            platform_id  UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
            price        NUMERIC(10, 2) NOT NULL,
            is_available BOOLEAN NOT NULL DEFAULT TRUE,
            recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_price_history_product_id  ON price_history (product_id)")
    op.execute("CREATE INDEX ix_price_history_recorded_at ON price_history (recorded_at)")

    # ── price_alerts ──────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE price_alerts (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
            product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            target_price NUMERIC(10, 2) NOT NULL,
            is_active    BOOLEAN NOT NULL DEFAULT TRUE,
            triggered_at TIMESTAMPTZ,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_price_alerts_user_id    ON price_alerts (user_id)")
    op.execute("CREATE INDEX ix_price_alerts_product_id ON price_alerts (product_id)")

    # ── carts ─────────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE carts (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
            session_id VARCHAR(128),
            is_active  BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_carts_user_id    ON carts (user_id)")
    op.execute("CREATE INDEX ix_carts_session_id ON carts (session_id)")

    # ── cart_items ────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE cart_items (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cart_id              UUID NOT NULL REFERENCES carts(id)     ON DELETE CASCADE,
            product_id           UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
            selected_platform_id UUID      REFERENCES platforms(id),
            quantity             INTEGER NOT NULL DEFAULT 1,
            snapshot_price       NUMERIC(10, 2),
            added_at             TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_cart_items_cart_id ON cart_items (cart_id)")

    # ── wishlists ─────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE wishlists (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name       VARCHAR(100) NOT NULL DEFAULT 'My Wishlist',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_wishlists_user_id ON wishlists (user_id)")

    # ── wishlist_items ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE wishlist_items (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
            product_id  UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
            added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # ── refresh_tokens ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE refresh_tokens (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash  VARCHAR(255) NOT NULL UNIQUE,
            expires_at  TIMESTAMPTZ NOT NULL,
            is_revoked  BOOLEAN NOT NULL DEFAULT FALSE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            user_agent  TEXT,
            ip_address  VARCHAR(45)
        )
    """)
    op.execute("CREATE INDEX ix_refresh_tokens_user_id    ON refresh_tokens (user_id)")
    op.execute("CREATE INDEX ix_refresh_tokens_token_hash ON refresh_tokens (token_hash)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS refresh_tokens CASCADE")
    op.execute("DROP TABLE IF EXISTS wishlist_items CASCADE")
    op.execute("DROP TABLE IF EXISTS wishlists CASCADE")
    op.execute("DROP TABLE IF EXISTS cart_items CASCADE")
    op.execute("DROP TABLE IF EXISTS carts CASCADE")
    op.execute("DROP TABLE IF EXISTS price_alerts CASCADE")
    op.execute("DROP TABLE IF EXISTS price_history CASCADE")
    op.execute("DROP TABLE IF EXISTS platform_prices CASCADE")
    op.execute("DROP TABLE IF EXISTS products CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    op.execute("DROP TABLE IF EXISTS platforms CASCADE")
    op.execute("DROP TABLE IF EXISTS categories CASCADE")
    op.execute("DROP TYPE IF EXISTS oauth_provider_enum CASCADE")

