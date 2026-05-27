#!/usr/bin/env python3
"""
save_scraped_to_db.py — Push scraped product data to the PriceBasket database.

This script reads /tmp/scraped_data.json (produced by scrape_real_data.py)
and upserts products + platform prices into the PostgreSQL database.

Usage (local with DATABASE_URL env var):
    DATABASE_URL=postgresql+asyncpg://... python3 scripts/save_scraped_to_db.py

Usage (on VPS — run from project root):
    cd /path/to/pricebasket
    source backend/.venv/bin/activate
    DATABASE_URL=$DATABASE_URL python3 scripts/save_scraped_to_db.py

Usage (with local .env):
    python3 scripts/save_scraped_to_db.py --env backend/.env
"""
import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional

# ── CLI args ──────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--env",  default="backend/.env", help="Path to .env file")
parser.add_argument("--file", default="/tmp/scraped_data.json", help="Scraped JSON file")
parser.add_argument("--dry-run", action="store_true", help="Parse only, don't write to DB")
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

# ── Validate DB URL ───────────────────────────────────────────────────────────
db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("❌  DATABASE_URL not set. Export it or pass --env path/to/.env")
    sys.exit(1)

# Normalise scheme for asyncpg
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

print(f"  DB: {db_url[:60]}...")


# ── Helpers ───────────────────────────────────────────────────────────────────
def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


# ── Platform metadata ─────────────────────────────────────────────────────────
PLATFORM_META = {
    "blinkit": {
        "name":                 "Blinkit",
        "slug":                 "blinkit",
        "logo_url":             "/logos/blinkit.svg",
        "base_url":             "https://blinkit.com",
        "color_hex":            "#0C831F",
        "avg_delivery_minutes": 10,
    },
    "zepto": {
        "name":                 "Zepto",
        "slug":                 "zepto",
        "logo_url":             "/logos/zepto.svg",
        "base_url":             "https://www.zeptonow.com",
        "color_hex":            "#8B2FC9",
        "avg_delivery_minutes": 8,
    },
    "instamart": {
        "name":                 "Swiggy Instamart",
        "slug":                 "instamart",
        "logo_url":             "/logos/instamart.svg",
        "base_url":             "https://www.swiggy.com/instamart",
        "color_hex":            "#FC8019",
        "avg_delivery_minutes": 15,
    },
    "bigbasket": {
        "name":                 "BigBasket",
        "slug":                 "bigbasket",
        "logo_url":             "/logos/bigbasket.svg",
        "base_url":             "https://www.bigbasket.com",
        "color_hex":            "#84C225",
        "avg_delivery_minutes": 20,
    },
    "jiomart": {
        "name":                 "JioMart",
        "slug":                 "jiomart",
        "logo_url":             "/logos/jiomart.svg",
        "base_url":             "https://www.jiomart.com",
        "color_hex":            "#0B3D91",
        "avg_delivery_minutes": 30,
    },
}

# ── Category mapping ──────────────────────────────────────────────────────────
QUERY_TO_CATEGORY = {
    "milk":             "dairy",
    "bread":            "bakery",
    "eggs":             "dairy",
    "butter":           "dairy",
    "rice":             "staples",
    "atta wheat flour": "staples",
    "sugar":            "staples",
    "salt":             "staples",
    "cooking oil":      "staples",
    "dal lentils":      "staples",
    "tomato":           "fruits-vegetables",
    "onion":            "fruits-vegetables",
    "potato":           "fruits-vegetables",
    "banana":           "fruits-vegetables",
    "apple":            "fruits-vegetables",
    "yogurt curd":      "dairy",
    "cheese":           "dairy",
    "paneer":           "dairy",
    "tea":              "beverages",
    "coffee":           "beverages",
    "biscuits":         "snacks",
    "chips":            "snacks",
    "noodles":          "snacks",
    "soap":             "personal-care",
    "shampoo":          "personal-care",
    "toothpaste":       "personal-care",
    "detergent":        "household",
}

CATEGORIES = {
    "dairy":             {"name": "Dairy & Eggs",        "icon": "🥛"},
    "bakery":            {"name": "Bakery",               "icon": "🍞"},
    "staples":           {"name": "Staples",              "icon": "🌾"},
    "fruits-vegetables": {"name": "Fruits & Vegetables",  "icon": "🥦"},
    "beverages":         {"name": "Beverages",            "icon": "☕"},
    "snacks":            {"name": "Snacks",               "icon": "🍿"},
    "personal-care":     {"name": "Personal Care",        "icon": "🧴"},
    "household":         {"name": "Household",            "icon": "🧹"},
    "groceries":         {"name": "Groceries",            "icon": "🛒"},
}


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    # Load scraped data
    if not os.path.exists(args.file):
        print(f"❌  File not found: {args.file}")
        print("    Run scripts/scrape_real_data.py first.")
        sys.exit(1)

    with open(args.file) as f:
        all_items = json.load(f)

    print(f"\n📦 Loaded {len(all_items)} scraped items from {args.file}")
    by_platform: dict = {}
    for item in all_items:
        p = item.get("platform", "unknown")
        by_platform[p] = by_platform.get(p, 0) + 1
    for p, c in sorted(by_platform.items()):
        print(f"   {p}: {c}")

    if args.dry_run:
        print("\n✅ Dry run — not writing to DB")
        return

    # Connect to DB
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select, text

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    from backend.app.models.product import Product, Category
    from backend.app.models.platform import Platform
    from backend.app.models.price import PlatformPrice

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        print("\n🔧 Upserting platforms...")
        platform_objs: dict[str, Platform] = {}
        for slug, meta in PLATFORM_META.items():
            res = await db.execute(select(Platform).where(Platform.slug == slug))
            plat = res.scalar_one_or_none()
            if not plat:
                plat = Platform(
                    id=uuid.uuid4(),
                    name=meta["name"],
                    slug=meta["slug"],
                    logo_url=meta["logo_url"],
                    base_url=meta["base_url"],
                    color_hex=meta.get("color_hex"),
                    avg_delivery_minutes=meta.get("avg_delivery_minutes", 15),
                    is_active=True,
                )
                db.add(plat)
                print(f"   ➕ Created platform: {slug}")
            else:
                print(f"   ✓  Platform exists: {slug}")
            platform_objs[slug] = plat
        await db.flush()

        print("\n🔧 Upserting categories...")
        category_objs: dict[str, Category] = {}
        for cat_slug, cat_meta in CATEGORIES.items():
            res = await db.execute(select(Category).where(Category.slug == cat_slug))
            cat = res.scalar_one_or_none()
            if not cat:
                cat = Category(
                    id=uuid.uuid4(),
                    name=cat_meta["name"],
                    slug=cat_slug,
                    icon=cat_meta["icon"],
                )
                db.add(cat)
                print(f"   ➕ Created category: {cat_slug}")
            category_objs[cat_slug] = cat
        await db.flush()

        print(f"\n💾 Saving {len(all_items)} products to DB...")
        saved = 0
        skipped = 0
        now = datetime.now(timezone.utc)

        for item in all_items:
            platform_slug = item.get("platform", "")
            platform = platform_objs.get(platform_slug)
            if not platform:
                skipped += 1
                continue

            name  = (item.get("name") or "").strip()[:200]
            price = item.get("price")
            if not name or not price or float(price) <= 0:
                skipped += 1
                continue

            # Determine category from query
            query    = item.get("query", "")
            cat_slug = QUERY_TO_CATEGORY.get(query, "groceries")
            category = category_objs.get(cat_slug) or category_objs.get("groceries")

            # Upsert product
            prod_slug = slugify(name)[:100]
            res = await db.execute(select(Product).where(Product.slug == prod_slug))
            product = res.scalar_one_or_none()
            if not product:
                product = Product(
                    id=uuid.uuid4(),
                    name=name,
                    slug=prod_slug,
                    category_id=category.id if category else None,
                    image_url=item.get("image_url") or None,
                    is_active=True,
                    is_featured=True,
                )
                db.add(product)
                await db.flush()
            elif not product.image_url and item.get("image_url"):
                product.image_url = item["image_url"]

            # Upsert platform price
            res = await db.execute(
                select(PlatformPrice).where(
                    PlatformPrice.product_id == product.id,
                    PlatformPrice.platform_id == platform.id,
                )
            )
            pp = res.scalar_one_or_none()
            price_val = float(price)
            mrp_val   = float(item.get("mrp") or price)
            discount  = round((mrp_val - price_val) / mrp_val * 100, 1) if mrp_val > price_val else 0.0

            if pp:
                pp.price          = price_val
                pp.original_price = mrp_val if mrp_val > price_val else None
                pp.discount_percent = discount
                pp.is_available   = item.get("in_stock", True)
                pp.last_updated   = now
                pp.platform_image_url = item.get("image_url") or pp.platform_image_url
            else:
                pp = PlatformPrice(
                    id=uuid.uuid4(),
                    product_id=product.id,
                    platform_id=platform.id,
                    price=price_val,
                    original_price=mrp_val if mrp_val > price_val else None,
                    discount_percent=discount,
                    is_available=item.get("in_stock", True),
                    last_updated=now,
                    platform_image_url=item.get("image_url") or None,
                    source="scrape",
                )
                db.add(pp)

            saved += 1

            # Commit in batches of 100
            if saved % 100 == 0:
                await db.commit()
                print(f"   ... {saved} saved so far")

        await db.commit()
        print(f"\n✅ Done! Saved: {saved}, Skipped: {skipped}")

        # Mark products as featured so they show on homepage
        print("\n🌟 Marking products as featured...")
        await db.execute(
            text("""
                UPDATE products SET is_featured = true
                WHERE is_active = true
                  AND id IN (
                      SELECT DISTINCT product_id FROM platform_prices
                      WHERE is_available = true
                  )
                  AND is_featured = false
                LIMIT 200
            """)
        )
        await db.commit()
        print("   ✅ Featured products updated")

    await engine.dispose()
    print("\n🎉 All done! Check pricebasket.in to see the live data.")


if __name__ == "__main__":
    asyncio.run(main())
