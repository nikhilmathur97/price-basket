#!/usr/bin/env python3
"""
fix_db_issues.py
────────────────────────────────────────────────────────────────────────────
Fixes three DB issues reported after dev validation:

Fix #1 — Category mismatches (408 products)
  • Products whose names start with "Baby " (Baby Apple, Baby Banana, Baby
    Potato, Baby Spinach, Baby Corn …) were scraped under grocery queries but
    ended up in wrong categories.  Re-assign them to baby-care ONLY when the
    product is clearly a baby-food / baby-care item.
  • Electronics / gadgets (MacBook, iPad, iPhone, charger, laptop, tablet,
    earphone, headphone, smartwatch) that slipped into grocery categories are
    deactivated (is_active = false).
  • Cosmetics / beauty products (mascara, lipstick, foundation, eyeliner,
    blush, concealer, eyeshadow, nail polish) that ended up in grocery
    categories are moved to personal-care.

Fix #3 — Haldiram's Aloo Bhujia with wrong samosa image
  • Deactivate any Haldiram product whose image URL contains "samosa" but
    whose name contains "bhujia".

Fix #4 — Maybelline Mascara with no image
  • Deactivate any Maybelline product that has no image_url.

Usage:
    cd /path/to/project
    python scripts/fix_db_issues.py
"""

import asyncio
import os
import sys
from pathlib import Path

# ── allow imports from backend ──────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

import asyncpg


# ── helpers ──────────────────────────────────────────────────────────────────

def get_dsn() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL not set in backend/.env")
    # Strip SQLAlchemy driver suffix: postgresql+asyncpg:// → postgresql://
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgresql+psycopg2://", "postgresql://")
    # Normalise legacy postgres:// → postgresql://
    url = url.replace("postgres://", "postgresql://", 1)
    return url


# ── keyword lists ─────────────────────────────────────────────────────────────

# These "baby" prefixed items are FOOD / PRODUCE — keep them in their correct
# grocery category (fruits-vegetables / staples etc.), do NOT move to baby-care.
BABY_FOOD_KEYWORDS = [
    "baby apple", "baby banana", "baby potato", "baby spinach",
    "baby corn", "baby carrot", "baby peas", "baby ginger",
    "baby tomato", "baby onion", "baby capsicum", "baby brinjal",
    "baby beetroot", "baby radish", "baby leek", "baby turnip",
    "baby zucchini", "baby squash", "baby fennel",
]

# Electronics / gadgets that should NOT be in grocery categories
ELECTRONICS_KEYWORDS = [
    "macbook", "ipad", "iphone", "laptop", "tablet", "charger",
    "earphone", "headphone", "earbuds", "smartwatch", "smart watch",
    "bluetooth speaker", "power bank", "usb cable", "hdmi",
    "keyboard", "mouse", "monitor", "printer", "router", "modem",
    "hard disk", "ssd", "pen drive", "memory card", "webcam",
    "graphics card", "processor", "ram ", "motherboard",
]

# Beauty / cosmetics that should go to personal-care
COSMETICS_KEYWORDS = [
    "mascara", "lipstick", "lip gloss", "foundation", "eyeliner",
    "blush", "concealer", "eyeshadow", "nail polish", "nail paint",
    "kajal", "kohl", "highlighter", "bronzer", "primer",
    "setting spray", "bb cream", "cc cream", "tinted moisturizer",
    "face powder", "compact powder",
]

# Grocery category slugs (electronics / cosmetics should NOT be here)
GROCERY_CATEGORY_SLUGS = [
    "fruits-vegetables", "dairy-breakfast", "snacks-drinks",
    "bakery", "household", "staples", "oils-spices",
    "chicken-meat", "frozen-foods",
]


async def run_fixes():
    dsn = get_dsn()
    conn = await asyncpg.connect(dsn)

    try:
        # ── Fetch category IDs we need ────────────────────────────────────────
        categories = await conn.fetch("SELECT id, slug FROM categories")
        cat_by_slug = {row["slug"]: row["id"] for row in categories}

        baby_care_id    = cat_by_slug.get("baby-care")
        personal_care_id = cat_by_slug.get("personal-care")

        if not baby_care_id:
            print("⚠️  baby-care category not found — skipping baby-care fixes")
        if not personal_care_id:
            print("⚠️  personal-care category not found — skipping cosmetics fixes")

        grocery_cat_ids = [
            cat_by_slug[s] for s in GROCERY_CATEGORY_SLUGS if s in cat_by_slug
        ]

        # ── Fix #1a: Electronics in grocery categories → deactivate ──────────
        electronics_deactivated = 0
        for kw in ELECTRONICS_KEYWORDS:
            result = await conn.execute(
                """
                UPDATE products
                SET    is_active = false
                WHERE  LOWER(name) LIKE $1
                  AND  category_id = ANY($2::uuid[])
                  AND  is_active = true
                """,
                f"%{kw}%",
                grocery_cat_ids,
            )
            n = int(result.split()[-1])
            if n:
                print(f"  🔌 Deactivated {n} electronics product(s) matching '{kw}'")
                electronics_deactivated += n

        print(f"Fix #1a — Electronics deactivated: {electronics_deactivated}")

        # ── Fix #1b: Cosmetics in grocery categories → move to personal-care ──
        cosmetics_moved = 0
        if personal_care_id:
            for kw in COSMETICS_KEYWORDS:
                result = await conn.execute(
                    """
                    UPDATE products
                    SET    category_id = $1
                    WHERE  LOWER(name) LIKE $2
                      AND  category_id = ANY($3::uuid[])
                      AND  is_active = true
                    """,
                    personal_care_id,
                    f"%{kw}%",
                    grocery_cat_ids,
                )
                n = int(result.split()[-1])
                if n:
                    print(f"  💄 Moved {n} cosmetics product(s) matching '{kw}' → personal-care")
                    cosmetics_moved += n

        print(f"Fix #1b — Cosmetics moved to personal-care: {cosmetics_moved}")

        # ── Fix #1c: Baby food items in baby-care → move to fruits-vegetables ─
        # "Baby Apple", "Baby Banana", "Baby Potato" etc. are PRODUCE, not
        # baby-care products.  Move them to fruits-vegetables.
        fruits_veg_id = cat_by_slug.get("fruits-vegetables")
        baby_produce_moved = 0
        if fruits_veg_id and baby_care_id:
            for kw in BABY_FOOD_KEYWORDS:
                result = await conn.execute(
                    """
                    UPDATE products
                    SET    category_id = $1
                    WHERE  LOWER(name) LIKE $2
                      AND  category_id = $3
                      AND  is_active = true
                    """,
                    fruits_veg_id,
                    f"%{kw}%",
                    baby_care_id,
                )
                n = int(result.split()[-1])
                if n:
                    print(f"  🍎 Moved {n} baby-produce product(s) matching '{kw}' → fruits-vegetables")
                    baby_produce_moved += n

        print(f"Fix #1c — Baby produce moved to fruits-vegetables: {baby_produce_moved}")

        # ── Fix #3: Haldiram's Aloo Bhujia with samosa image → deactivate ─────
        result = await conn.execute(
            """
            UPDATE products
            SET    is_active = false
            WHERE  LOWER(name) LIKE '%haldiram%'
              AND  LOWER(name) LIKE '%bhujia%'
              AND  LOWER(image_url) LIKE '%samosa%'
              AND  is_active = true
            """
        )
        n3 = int(result.split()[-1])
        print(f"Fix #3 — Haldiram Bhujia with samosa image deactivated: {n3}")

        # Also deactivate any Haldiram bhujia with a clearly wrong image
        # (image URL contains 'samosa' OR 'aloo-tikki' OR 'kachori')
        result2 = await conn.execute(
            """
            UPDATE products
            SET    is_active = false
            WHERE  LOWER(name) LIKE '%haldiram%'
              AND  LOWER(name) LIKE '%bhujia%'
              AND  (
                    LOWER(image_url) LIKE '%samosa%'
                 OR LOWER(image_url) LIKE '%kachori%'
                 OR LOWER(image_url) LIKE '%tikki%'
              )
              AND  is_active = true
            """
        )
        n3b = int(result2.split()[-1])
        if n3b:
            print(f"Fix #3b — Additional Haldiram Bhujia with wrong image deactivated: {n3b}")

        # ── Fix #4: Maybelline products with no image → deactivate ────────────
        result = await conn.execute(
            """
            UPDATE products
            SET    is_active = false
            WHERE  LOWER(name) LIKE '%maybelline%'
              AND  (image_url IS NULL OR TRIM(image_url) = '')
              AND  is_active = true
            """
        )
        n4 = int(result.split()[-1])
        print(f"Fix #4 — Maybelline products with no image deactivated: {n4}")

        # ── Summary ───────────────────────────────────────────────────────────
        total_active = await conn.fetchval(
            "SELECT COUNT(*) FROM products WHERE is_active = true"
        )
        total_with_image = await conn.fetchval(
            "SELECT COUNT(*) FROM products WHERE is_active = true AND image_url IS NOT NULL AND TRIM(image_url) != ''"
        )
        print(f"\n✅ Done!")
        print(f"   Active products:            {total_active}")
        print(f"   Active with image:           {total_with_image}")
        print(f"   Active without image:        {total_active - total_with_image}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_fixes())
