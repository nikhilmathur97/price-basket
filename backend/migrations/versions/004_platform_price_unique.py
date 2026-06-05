"""Replace partial unique index with unconditional unique constraint on platform_prices.

Revision ID: 004_platform_price_unique
Revises: 003_user_fcm_token
Create Date: 2026-06-05

The old partial unique index (WHERE is_available = TRUE) still allowed
duplicate rows when is_available = FALSE, and the ON CONFLICT upserts in
the application use the unconditional constraint name.  Replace the partial
index with a plain UNIQUE constraint covering all rows.

Steps:
  1. Deduplicate inactive rows that the old partial index didn't prevent.
  2. Drop the old partial unique index.
  3. Add the unconditional UNIQUE constraint.
"""
from alembic import op

revision = "004_platform_price_unique"
down_revision = "003_user_fcm_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Deduplicate inactive rows — keep the most-recently-updated one per pair.
    # (Active rows were already deduped in migration 002.)
    op.execute(
        """
        DELETE FROM platform_prices
        WHERE is_available = FALSE
          AND id NOT IN (
            SELECT DISTINCT ON (platform_id, product_id) id
            FROM platform_prices
            WHERE is_available = FALSE
            ORDER BY platform_id, product_id, last_updated DESC
          )
        """
    )

    # Also deduplicate cross-availability duplicates: if a product+platform has
    # rows with different is_available values, keep only the latest overall.
    op.execute(
        """
        DELETE FROM platform_prices
        WHERE id NOT IN (
            SELECT DISTINCT ON (platform_id, product_id) id
            FROM platform_prices
            ORDER BY platform_id, product_id, last_updated DESC
        )
        """
    )

    # Drop the old partial unique index (Migration 002).
    op.execute("DROP INDEX IF EXISTS ix_platform_prices_platform_product")

    # Add an unconditional unique constraint — used by ON CONFLICT DO UPDATE.
    op.create_unique_constraint(
        "uq_platform_prices_product_platform",
        "platform_prices",
        ["product_id", "platform_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_platform_prices_product_platform",
        "platform_prices",
        type_="unique",
    )
    # Restore the partial unique index
    import sqlalchemy as sa
    op.create_index(
        "ix_platform_prices_platform_product",
        "platform_prices",
        ["platform_id", "product_id"],
        unique=True,
        postgresql_where=sa.text("is_available = TRUE"),
    )
