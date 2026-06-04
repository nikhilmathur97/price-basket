"""Add performance indexes for hot query paths.

Revision ID: 002_performance_indexes
Revises: 001_user_events
Create Date: 2026-06-04

These indexes eliminate sequential scans on the most-hit queries:
  - featured products homepage load
  - active product listing / search
  - platform price lookups
  - price history queries
"""
from alembic import op
import sqlalchemy as sa

revision = "002_performance_indexes"
down_revision = "001_user_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── products table ────────────────────────────────────────────────────────
    # Homepage featured query: WHERE is_active=TRUE AND is_featured=TRUE ORDER BY created_at DESC
    op.create_index(
        "ix_products_active_featured",
        "products",
        ["is_active", "is_featured", sa.text("created_at DESC")],
        postgresql_where=sa.text("is_active = TRUE AND is_featured = TRUE"),
    )

    # Category browse: WHERE is_active=TRUE AND category_id=?
    op.create_index(
        "ix_products_active_category",
        "products",
        ["is_active", "category_id"],
        postgresql_where=sa.text("is_active = TRUE"),
    )

    # Full-text search on name + brand (GIN index for ilike queries)
    # Falls back gracefully if pg_trgm extension is not installed
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_products_name_trgm "
            "ON products USING gin (name gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_products_brand_trgm "
            "ON products USING gin (brand gin_trgm_ops)"
        )
    except Exception:
        pass  # Non-fatal — ilike still works, just slower

    # ── platform_prices table ─────────────────────────────────────────────────
    # Price lookup per product: WHERE product_id=? AND is_available=TRUE
    op.create_index(
        "ix_platform_prices_product_available",
        "platform_prices",
        ["product_id", "is_available"],
    )

    # Price lookup per platform: WHERE platform_id=? AND product_id=?
    op.create_index(
        "ix_platform_prices_platform_product",
        "platform_prices",
        ["platform_id", "product_id"],
        unique=True,
        postgresql_where=sa.text("is_available = TRUE"),
    )

    # ── price_history table ───────────────────────────────────────────────────
    # History queries: WHERE product_id=? AND platform_id=? ORDER BY recorded_at DESC
    op.create_index(
        "ix_price_history_product_platform_time",
        "price_history",
        ["product_id", "platform_id", sa.text("recorded_at DESC")],
    )

    # ── categories table ──────────────────────────────────────────────────────
    op.create_index(
        "ix_categories_active_slug",
        "categories",
        ["is_active", "slug"],
        postgresql_where=sa.text("is_active = TRUE"),
    )


def downgrade() -> None:
    op.drop_index("ix_products_active_featured", table_name="products")
    op.drop_index("ix_products_active_category", table_name="products")
    op.drop_index("ix_platform_prices_product_available", table_name="platform_prices")
    try:
        op.drop_index("ix_platform_prices_platform_product", table_name="platform_prices")
    except Exception:
        pass
    op.drop_index("ix_price_history_product_platform_time", table_name="price_history")
    op.drop_index("ix_categories_active_slug", table_name="categories")
    try:
        op.execute("DROP INDEX IF EXISTS ix_products_name_trgm")
        op.execute("DROP INDEX IF EXISTS ix_products_brand_trgm")
    except Exception:
        pass
