#!/usr/bin/env python3
"""
create_electronics_category.py
────────────────────────────────────────────────────────────────────────────
1. Creates an 'electronics' category in the DB (if it doesn't exist).
2. Re-activates the 65 electronics products that were deactivated.
3. Moves them to the new electronics category.

Usage:
    cd /path/to/project
    python scripts/create_electronics_category.py
"""

import asyncio
import os
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

import asyncpg


ELECTRONICS_KEYWORDS = [
    "macbook", "ipad", "iphone", "laptop", "tablet", "charger",
    "earphone", "headphone", "earbuds", "smartwatch", "smart watch",
    "bluetooth speaker", "power bank", "usb cable", "hdmi",
    "keyboard", "mouse", "monitor", "printer", "router", "modem",
    "hard disk", "ssd", "pen drive", "memory card", "webcam",
    "graphics card", "processor", "ram ", "motherboard",
]


def get_dsn() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL not set in backend/.env")
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgresql+psycopg2://", "postgresql://")
    url = url.replace("postgres://", "postgresql://", 1)
    return url


async def run():
    dsn = get_dsn()
    conn = await asyncpg.connect(dsn)

    try:
        # ── 1. Upsert electronics category ───────────────────────────────────
        existing = await conn.fetchrow(
            "SELECT id FROM categories WHERE slug = 'electronics'"
        )
        if existing:
            electronics_id = existing["id"]
            print(f"✅ Electronics category already exists: {electronics_id}")
        else:
            electronics_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO categories (id, slug, name, icon, display_order, is_active)
                VALUES ($1, 'electronics', 'Electronics', '📱', 13, true)
                ON CONFLICT (slug) DO NOTHING
                """,
                electronics_id,
            )
            # Re-fetch in case of conflict
            row = await conn.fetchrow("SELECT id FROM categories WHERE slug = 'electronics'")
            electronics_id = row["id"]
            print(f"✅ Created electronics category: {electronics_id}")

        # ── 2. Re-activate + move electronics products ───────────────────────
        total_moved = 0
        for kw in ELECTRONICS_KEYWORDS:
            result = await conn.execute(
                """
                UPDATE products
                SET    category_id = $1,
                       is_active   = true
                WHERE  LOWER(name) LIKE $2
                  AND  (is_active = false OR category_id != $1)
                """,
                electronics_id,
                f"%{kw}%",
            )
            n = int(result.split()[-1])
            if n:
                print(f"  📱 Moved/re-activated {n} product(s) matching '{kw}'")
                total_moved += n

        print(f"\nTotal electronics products moved/re-activated: {total_moved}")

        # ── 3. Summary ────────────────────────────────────────────────────────
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true",
            electronics_id,
        )
        print(f"Active electronics products in DB: {count}")

        total_active = await conn.fetchval(
            "SELECT COUNT(*) FROM products WHERE is_active = true"
        )
        print(f"Total active products: {total_active}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
