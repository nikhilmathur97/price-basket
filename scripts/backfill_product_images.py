#!/usr/bin/env python3
"""
backfill_product_images.py
==========================
One-time migration: backfill image_url and thumbnail_url for all products
that currently have NULL in those fields but have a platform_image_url
available in their platform_prices rows.

This permanently fixes the "blank images on home page" issue for all
existing scraped products in the database.

Usage (from repo root):
    python scripts/backfill_product_images.py
    python scripts/backfill_product_images.py --dry-run   # preview only
    python scripts/backfill_product_images.py --env backend/.env

What it does:
    UPDATE products p
    SET
        image_url     = first non-null platform_image_url from platform_prices,
        thumbnail_url = same value,
        updated_at    = NOW()
    WHERE (p.image_url IS NULL OR p.image_url = '')
      AND (p.thumbnail_url IS NULL OR p.thumbnail_url = '')
      AND EXISTS (
          SELECT 1 FROM platform_prices pp
          WHERE pp.product_id = p.id
            AND pp.platform_image_url IS NOT NULL
            AND pp.platform_image_url != ''
      )
"""
import argparse
import asyncio
import os
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--env", default="backend/.env", help="Path to .env file")
parser.add_argument("--dry-run", action="store_true", help="Show count only, don't update")
args = parser.parse_args()

# ── Load .env ─────────────────────────────────────────────────────────────────
for env_path in [args.env, "backend/.env", ".env"]:
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())
        print(f"  Loaded env from {env_path}")
        break

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("❌  DATABASE_URL not set.")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

print(f"  DB: {db_url[:70]}...\n")


async def main():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)

    async with engine.begin() as conn:
        # ── Step 1: Fix products with empty/null image_url from platform_image_url ──
        count_result = await conn.execute(text("""
            SELECT COUNT(DISTINCT p.id)
            FROM products p
            WHERE (p.image_url IS NULL OR p.image_url = '')
              AND EXISTS (
                  SELECT 1 FROM platform_prices pp
                  WHERE pp.product_id = p.id
                    AND pp.platform_image_url IS NOT NULL
                    AND pp.platform_image_url != ''
              )
        """))
        affected_no_image = count_result.scalar()

        # ── Step 2: Count products with image_url but missing thumbnail_url ──
        count_result2 = await conn.execute(text("""
            SELECT COUNT(*)
            FROM products
            WHERE is_active = true
              AND (thumbnail_url IS NULL OR thumbnail_url = '')
              AND image_url IS NOT NULL AND image_url != ''
        """))
        affected_no_thumb = count_result2.scalar()

        print(f"  Products with empty/null image_url (fixable from platform_prices): {affected_no_image}")
        print(f"  Products with image_url but no thumbnail_url:                      {affected_no_thumb}")

        if args.dry_run:
            print("\n✅ Dry run — no changes made.")
            await engine.dispose()
            return

        if affected_no_image == 0 and affected_no_thumb == 0:
            print("\n✅ Nothing to backfill — all products already have images.")
        else:
            print(f"\n  Backfilling...")

        # ── Fix 1: Promote platform_image_url → image_url for products missing it ──
        if affected_no_image > 0:
            result = await conn.execute(text("""
                UPDATE products p
                SET
                    image_url     = sub.img,
                    thumbnail_url = COALESCE(NULLIF(p.thumbnail_url, ''), sub.img),
                    updated_at    = NOW()
                FROM (
                    SELECT DISTINCT ON (pp.product_id)
                        pp.product_id,
                        pp.platform_image_url AS img
                    FROM platform_prices pp
                    WHERE pp.platform_image_url IS NOT NULL
                      AND pp.platform_image_url != ''
                    ORDER BY pp.product_id, pp.last_updated DESC
                ) sub
                WHERE p.id = sub.product_id
                  AND (p.image_url IS NULL OR p.image_url = '')
            """))
            print(f"  ✅ Promoted platform_image_url → image_url for {result.rowcount} products.")

        # ── Fix 2: Backfill thumbnail_url = image_url for all products missing it ──
        if affected_no_thumb > 0:
            result2 = await conn.execute(text("""
                UPDATE products
                SET
                    thumbnail_url = image_url,
                    updated_at    = NOW()
                WHERE (thumbnail_url IS NULL OR thumbnail_url = '')
                  AND image_url IS NOT NULL
                  AND image_url != ''
            """))
            print(f"  ✅ Backfilled thumbnail_url for {result2.rowcount} products.")

        # ── Fix 3: Ensure all products with available prices are featured ─────
        feat_result = await conn.execute(text("""
            UPDATE products SET is_featured = true
            WHERE is_active = true
              AND is_featured = false
              AND id IN (
                  SELECT DISTINCT product_id FROM platform_prices
                  WHERE is_available = true
              )
        """))
        if feat_result.rowcount > 0:
            print(f"  ✅ Marked {feat_result.rowcount} additional products as featured.")

        # ── Final stats ───────────────────────────────────────────────────────
        stats = await conn.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE is_active = true)                          AS total_active,
                COUNT(*) FILTER (WHERE is_active = true AND is_featured = true)   AS total_featured,
                COUNT(*) FILTER (WHERE is_active = true AND image_url IS NOT NULL
                                   AND image_url != '')                            AS with_image,
                COUNT(*) FILTER (WHERE is_active = true
                                   AND (image_url IS NULL OR image_url = ''))      AS without_image
            FROM products
        """))
        row = stats.fetchone()
        print(f"\n📊 Database summary after backfill:")
        print(f"   Total active products : {row[0]}")
        print(f"   Featured products     : {row[1]}")
        print(f"   Products with image   : {row[2]}")
        print(f"   Products without image: {row[3]}")

        if row[3] and row[3] > 0:
            print(f"\n  ⚠️  {row[3]} products still have no image.")
            print("     These have no platform_image_url in any price row.")
            print("     Re-run the scraper to populate images for these products.")

    await engine.dispose()
    print("\n🎉 Backfill complete! Redis cache will auto-expire within 5 minutes,")
    print("   or run: python scripts/flush_featured_cache.py to clear it immediately.")


if __name__ == "__main__":
    asyncio.run(main())
