#!/usr/bin/env python3
"""
save_scraped_to_db.py — Push scraped product data to the PriceBasket database.

This script reads backend/app/data/scraped_prices.json (produced by the scrapers)
and upserts products + platform prices into the PostgreSQL database.

Improvements over v1:
  - Extracts unit from product name (e.g. "500 ml", "1 kg", "250 g")
  - Better category detection using keyword matching
  - Extracts brand from product name
  - Marks products as featured for homepage display
  - Handles duplicate products by merging platform prices
  - Progress reporting with per-category stats

Usage (local with DATABASE_URL env var):
    DATABASE_URL=postgresql+asyncpg://... python3 scripts/save_scraped_to_db.py

Usage (with local .env):
    python3 scripts/save_scraped_to_db.py --env backend/.env

Usage (seed from scraped_prices.json directly):
    python3 scripts/save_scraped_to_db.py --file backend/app/data/scraped_prices.json
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
parser.add_argument("--file", default="backend/app/data/scraped_prices.json",
                    help="Scraped JSON file (default: backend/app/data/scraped_prices.json)")
parser.add_argument("--dry-run", action="store_true", help="Parse only, don't write to DB")
parser.add_argument("--limit", type=int, default=None, help="Limit number of items to process")
parser.add_argument("--platform", default=None, help="Only process items from this platform")
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
    """Convert text to URL-safe slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:100]


def extract_unit(name: str, existing_unit: str = "") -> str:
    """Extract unit/quantity from product name (e.g. '500 ml', '1 kg', '250 g')."""
    if existing_unit and existing_unit.strip():
        return existing_unit.strip()

    # Common unit patterns
    patterns = [
        r'\b(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams|litre|liter|l|ml|ltr|ltrs|pcs|pc|pack|pk|pieces|piece|nos|no)\b',
        r'\b(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|ml|kg|l)\b',  # e.g. "6 x 100g"
        r'\b(\d+)\s*(tabs?|capsules?|sachets?|pouches?)\b',
    ]

    name_lower = name.lower()
    for pattern in patterns:
        m = re.search(pattern, name_lower)
        if m:
            return m.group(0).strip()

    return ""


def extract_brand(name: str) -> Optional[str]:
    """Extract brand name from product name using known brand list."""
    known_brands = [
        "Amul", "Mother Dairy", "Nestle", "Britannia", "Parle", "Tata",
        "ITC", "HUL", "Hindustan Unilever", "Dabur", "Marico", "Godrej",
        "Patanjali", "Haldiram", "Haldiram's", "Bikaji", "Bingo",
        "Lay's", "Lays", "Kurkure", "Maggi", "Sunfeast", "Yippee",
        "Cadbury", "Mondelez", "Ferrero", "Kinder",
        "Coca-Cola", "Pepsi", "Sprite", "Fanta", "Limca", "Thums Up",
        "Tropicana", "Real", "Paper Boat", "Appy", "Frooti",
        "Red Bull", "Monster", "Sting",
        "Aashirvaad", "Pillsbury", "Nature Fresh", "Annapurna",
        "India Gate", "Daawat", "Kohinoor", "Fortune", "Saffola",
        "Tata Sampann", "Tata Salt", "Catch", "Everest", "MDH", "MTR",
        "Surf Excel", "Ariel", "Tide", "Rin", "Wheel",
        "Vim", "Harpic", "Lizol", "Colin", "Domex", "Pril",
        "Dettol", "Savlon", "Lifebuoy",
        "Dove", "Lux", "Pears", "Santoor", "Hamam",
        "Head & Shoulders", "Pantene", "Sunsilk", "Clinic Plus",
        "Colgate", "Pepsodent", "Sensodyne", "Oral-B",
        "Vaseline", "Nivea", "Pond's", "Fair & Lovely", "Lakme",
        "Gillette", "Whisper", "Stayfree", "Carefree",
        "Himalaya", "Biotique", "Mamaearth", "WOW",
        "Johnson", "Johnson's", "Pampers", "Huggies",
        "Licious", "Country Delight", "Suguna", "Venky's",
        "Fresho", "Farm Fresh", "Epigamia",
        "Kellogg's", "Quaker", "Horlicks", "Boost", "Complan",
        "Nescafe", "Bru", "Tata Tea", "Red Label", "Lipton",
        "Kissan", "Maggi", "Knorr",
    ]

    name_lower = name.lower()
    for brand in known_brands:
        if brand.lower() in name_lower:
            return brand
    return None


def guess_category(name: str, query: str) -> str:
    """Guess category slug from product name or query."""
    text = (name + " " + query).lower()

    # Ordered from most specific to least specific
    rules = [
        # Baby Care
        (["pampers", "huggies", "diaper", "nappy", "cerelac", "nestum", "baby food",
          "johnson baby", "baby shampoo", "baby lotion", "baby powder"], "baby-care"),
        # Chicken & Meat
        (["chicken", "mutton", "fish", "prawn", "shrimp", "licious", "meat",
          "seafood", "egg", "eggs"], "chicken-meat"),
        # Dairy & Breakfast
        (["milk", "butter", "paneer", "curd", "dahi", "yogurt", "ghee", "cream",
          "cheese", "lassi", "buttermilk", "dairy", "horlicks", "boost", "complan",
          "nescafe", "coffee", "tea", "oats", "cornflakes", "muesli", "honey",
          "jam", "poha", "upma", "idli", "dosa", "breakfast"], "dairy-breakfast"),
        # Fruits & Vegetables
        (["onion", "tomato", "potato", "banana", "apple", "mango", "orange",
          "lemon", "lime", "spinach", "palak", "capsicum", "carrot", "cucumber",
          "cauliflower", "broccoli", "cabbage", "peas", "beans", "okra", "bhindi",
          "grapes", "watermelon", "papaya", "guava", "pineapple", "strawberry",
          "vegetable", "fruit", "fresh", "sabzi"], "fruits-vegetables"),
        # Oils & Spices
        (["oil", "ghee", "vanaspati", "turmeric", "haldi", "chilli", "chili",
          "masala", "pepper", "cumin", "jeera", "coriander", "dhania", "mustard",
          "cardamom", "clove", "cinnamon", "bay leaf", "spice", "seasoning",
          "vinegar", "soy sauce"], "oils-spices"),
        # Staples
        (["atta", "flour", "maida", "suji", "semolina", "besan", "rice", "dal",
          "lentil", "rajma", "chana", "moong", "urad", "salt", "sugar", "jaggery",
          "ketchup", "sauce", "pickle", "papad", "popcorn", "staple"], "staples"),
        # Snacks & Drinks
        (["lays", "chips", "kurkure", "bhujia", "namkeen", "biscuit", "cookie",
          "cracker", "wafer", "chocolate", "candy", "toffee", "noodles", "pasta",
          "maggi", "cola", "pepsi", "sprite", "juice", "drink", "water", "soda",
          "energy drink", "redbull", "monster", "snack", "munch", "oreo",
          "bourbon", "marie", "parle-g", "parle g"], "snacks-drinks"),
        # Bakery
        (["bread", "bun", "pav", "cake", "muffin", "rusk", "toast", "croissant",
          "bakery", "pastry"], "bakery"),
        # Personal Care
        (["soap", "shampoo", "conditioner", "face wash", "moisturizer", "lotion",
          "cream", "sunscreen", "deodorant", "perfume", "cologne", "toothpaste",
          "toothbrush", "mouthwash", "razor", "shaving", "sanitary", "pad",
          "tampon", "hair oil", "hair gel", "hair color", "nail", "lipstick",
          "foundation", "mascara", "kajal", "eyeliner", "personal care",
          "skincare", "haircare", "oral care", "feminine"], "personal-care"),
        # Household
        (["detergent", "washing powder", "fabric", "dishwash", "dish wash",
          "toilet cleaner", "floor cleaner", "glass cleaner", "surface cleaner",
          "scrubber", "mop", "broom", "dustbin", "garbage bag", "tissue",
          "napkin", "toilet paper", "household", "cleaning", "sanitizer",
          "disinfectant", "phenyl", "bleach", "harpic", "lizol", "vim",
          "surf", "ariel", "tide"], "household"),
    ]

    for keywords, category in rules:
        for kw in keywords:
            if kw in text:
                return category

    return "snacks-drinks"  # default


# ── Platform metadata ─────────────────────────────────────────────────────────
PLATFORM_META = {
    "blinkit": {
        "name": "Blinkit",
        "slug": "blinkit",
        "logo_url": "/logos/blinkit.svg",
        "base_url": "https://blinkit.com",
        "color_hex": "#0C831F",
        "avg_delivery_minutes": 10,
        "min_order_amount": 0,
        "delivery_fee": 25,
        "free_delivery_threshold": 199,
    },
    "zepto": {
        "name": "Zepto",
        "slug": "zepto",
        "logo_url": "/logos/zepto.svg",
        "base_url": "https://www.zeptonow.com",
        "color_hex": "#8B2FC9",
        "avg_delivery_minutes": 8,
        "min_order_amount": 0,
        "delivery_fee": 20,
        "free_delivery_threshold": 149,
    },
    "instamart": {
        "name": "Swiggy Instamart",
        "slug": "instamart",
        "logo_url": "/logos/instamart.svg",
        "base_url": "https://www.swiggy.com/instamart",
        "color_hex": "#FC8019",
        "avg_delivery_minutes": 15,
        "min_order_amount": 0,
        "delivery_fee": 30,
        "free_delivery_threshold": 299,
    },
    "bigbasket": {
        "name": "BigBasket",
        "slug": "bigbasket",
        "logo_url": "/logos/bigbasket.svg",
        "base_url": "https://www.bigbasket.com",
        "color_hex": "#84C225",
        "avg_delivery_minutes": 30,
        "min_order_amount": 200,
        "delivery_fee": 40,
        "free_delivery_threshold": 500,
    },
    "jiomart": {
        "name": "JioMart Express",
        "slug": "jiomart",
        "logo_url": "/logos/jiomart.svg",
        "base_url": "https://www.jiomart.com",
        "color_hex": "#0B3D91",
        "avg_delivery_minutes": 30,
        "min_order_amount": 0,
        "delivery_fee": 35,
        "free_delivery_threshold": 399,
    },
    "amazon": {
        "name": "Amazon Fresh",
        "slug": "amazon",
        "logo_url": "/logos/amazon.svg",
        "base_url": "https://www.amazon.in",
        "color_hex": "#FF9900",
        "avg_delivery_minutes": 120,
        "min_order_amount": 0,
        "delivery_fee": 40,
        "free_delivery_threshold": 499,
    },
    "flipkart": {
        "name": "Flipkart Minutes",
        "slug": "flipkart",
        "logo_url": "/logos/flipkart.svg",
        "base_url": "https://www.flipkart.com",
        "color_hex": "#2874F0",
        "avg_delivery_minutes": 10,
        "min_order_amount": 0,
        "delivery_fee": 20,
        "free_delivery_threshold": 199,
    },
}

# ── Category definitions ──────────────────────────────────────────────────────
CATEGORIES = {
    "dairy-breakfast":   {"name": "Dairy & Breakfast",   "icon": "🥛", "display_order": 1},
    "fruits-vegetables": {"name": "Fruits & Vegetables",  "icon": "🥦", "display_order": 2},
    "snacks-drinks":     {"name": "Snacks & Drinks",      "icon": "🍿", "display_order": 3},
    "bakery":            {"name": "Bakery & Biscuits",    "icon": "🍞", "display_order": 4},
    "staples":           {"name": "Atta, Rice & Dal",     "icon": "🌾", "display_order": 5},
    "oils-spices":       {"name": "Oils & Spices",        "icon": "🫙", "display_order": 6},
    "household":         {"name": "Household",            "icon": "🧹", "display_order": 7},
    "personal-care":     {"name": "Personal Care",        "icon": "🧴", "display_order": 8},
    "chicken-meat":      {"name": "Chicken & Meat",       "icon": "🍗", "display_order": 9},
    "baby-care":         {"name": "Baby Care",            "icon": "👶", "display_order": 10},
    "frozen-foods":      {"name": "Frozen Foods",         "icon": "🧊", "display_order": 11},
    "pet-care":          {"name": "Pet Care",             "icon": "🐾", "display_order": 12},
}


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    # Load scraped data
    file_path = args.file
    # Try multiple locations
    for candidate in [file_path, "/tmp/scraped_bulk.json", "/tmp/scraped_data.json"]:
        if os.path.exists(candidate):
            file_path = candidate
            break
    else:
        print(f"❌  File not found: {args.file}")
        print("    Run scripts/scrape_all_platforms_bulk.py first.")
        sys.exit(1)

    with open(file_path) as f:
        all_items = json.load(f)

    # Filter by platform if specified
    if args.platform:
        all_items = [i for i in all_items if i.get("platform") == args.platform]
        print(f"  Filtered to platform: {args.platform}")

    # Apply limit
    if args.limit:
        all_items = all_items[:args.limit]

    print(f"\n📦 Loaded {len(all_items)} scraped items from {file_path}")

    # Stats
    by_platform: dict = {}
    by_category: dict = {}
    for item in all_items:
        p = item.get("platform", "unknown")
        by_platform[p] = by_platform.get(p, 0) + 1
        cat = guess_category(item.get("name", ""), item.get("query", ""))
        by_category[cat] = by_category.get(cat, 0) + 1

    print("\n  By platform:")
    for p, c in sorted(by_platform.items()):
        print(f"    {p}: {c}")
    print("\n  By category (estimated):")
    for cat, c in sorted(by_category.items(), key=lambda x: -x[1]):
        print(f"    {cat}: {c}")

    if args.dry_run:
        print("\n✅ Dry run — not writing to DB")
        return

    # Connect to DB
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select, text
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    try:
        from backend.app.models.product import Product, Category
        from backend.app.models.platform import Platform
        from backend.app.models.price import PlatformPrice
    except ImportError:
        from app.models.product import Product, Category
        from app.models.platform import Platform
        from app.models.price import PlatformPrice

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # ── Upsert platforms ──────────────────────────────────────────────────
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
                    logo_url=meta.get("logo_url"),
                    base_url=meta.get("base_url"),
                    color_hex=meta.get("color_hex"),
                    avg_delivery_minutes=meta.get("avg_delivery_minutes", 15),
                    min_order_amount=meta.get("min_order_amount", 0),
                    delivery_fee=meta.get("delivery_fee", 0),
                    free_delivery_threshold=meta.get("free_delivery_threshold"),
                    is_active=True,
                    scraping_enabled=True,
                )
                db.add(plat)
                print(f"   ➕ Created platform: {slug}")
            else:
                # Update metadata
                plat.avg_delivery_minutes = meta.get("avg_delivery_minutes", plat.avg_delivery_minutes)
                plat.color_hex = meta.get("color_hex", plat.color_hex)
                print(f"   ✓  Platform exists: {slug}")
            platform_objs[slug] = plat
        await db.flush()

        # ── Upsert categories ─────────────────────────────────────────────────
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
                    display_order=cat_meta.get("display_order", 99),
                    is_active=True,
                )
                db.add(cat)
                print(f"   ➕ Created category: {cat_slug}")
            category_objs[cat_slug] = cat
        await db.flush()

        # ── Save products + prices ────────────────────────────────────────────
        print(f"\n💾 Saving {len(all_items)} products to DB...")
        saved = 0
        updated = 0
        skipped = 0
        now = datetime.now(timezone.utc)

        # Track product slugs we've seen to avoid duplicate processing
        seen_products: dict[str, Product] = {}

        for idx, item in enumerate(all_items):
            platform_slug = item.get("platform", "")
            platform = platform_objs.get(platform_slug)
            if not platform:
                skipped += 1
                continue

            name = (item.get("name") or "").strip()
            # Clean up name: remove extra whitespace, truncate
            name = re.sub(r"\s+", " ", name)[:200]
            price = item.get("price")
            if not name or not price or float(price) <= 0:
                skipped += 1
                continue

            # Skip obviously bad data
            if float(price) > 50000:  # ₹50,000 max sanity check
                skipped += 1
                continue

            # Determine category
            query = item.get("query", "")
            cat_slug = guess_category(name, query)
            category = category_objs.get(cat_slug) or category_objs.get("snacks-drinks")

            # Extract unit and brand
            unit = extract_unit(name, item.get("unit", ""))
            brand = extract_brand(name)

            # Upsert product
            prod_slug = slugify(name)

            # Check cache first
            product = seen_products.get(prod_slug)
            if not product:
                res = await db.execute(select(Product).where(Product.slug == prod_slug))
                product = res.scalar_one_or_none()

            if not product:
                product = Product(
                    id=uuid.uuid4(),
                    name=name,
                    slug=prod_slug,
                    brand=brand,
                    unit=unit or None,
                    description=f"{name} — Compare prices across Blinkit, Zepto, BigBasket, Instamart and more.",
                    category_id=category.id if category else None,
                    image_url=item.get("image_url") or None,
                    thumbnail_url=item.get("image_url") or None,
                    is_active=True,
                    is_featured=True,  # All scraped products are featured
                )
                db.add(product)
                await db.flush()
                saved += 1
            else:
                # Update missing fields
                changed = False
                if not product.image_url and item.get("image_url"):
                    product.image_url = item["image_url"]
                    product.thumbnail_url = item["image_url"]
                    changed = True
                if not product.unit and unit:
                    product.unit = unit
                    changed = True
                if not product.brand and brand:
                    product.brand = brand
                    changed = True
                if not product.is_featured:
                    product.is_featured = True
                    changed = True
                if changed:
                    updated += 1

            seen_products[prod_slug] = product

            # Upsert platform price
            price_val = float(price)
            mrp_val = float(item.get("mrp") or price)
            if mrp_val < price_val:
                mrp_val = price_val
            discount = round((mrp_val - price_val) / mrp_val * 100, 1) if mrp_val > price_val else 0.0

            await db.execute(
                pg_insert(PlatformPrice)
                .values(
                    id=uuid.uuid4(),
                    product_id=product.id,
                    platform_id=platform.id,
                    price=price_val,
                    original_price=mrp_val if mrp_val > price_val else None,
                    discount_percent=discount,
                    discount_label=f"{int(discount)}% OFF" if discount > 0 else None,
                    is_available=item.get("in_stock", True),
                    delivery_time_minutes=platform.avg_delivery_minutes,
                    platform_product_id=item.get("pid") or None,
                    platform_product_url=item.get("url") or None,
                    platform_image_url=item.get("image_url") or None,
                    last_updated=now,
                    source=item.get("source", "scrape"),
                )
                .on_conflict_do_update(
                    constraint="uq_platform_prices_product_platform",
                    set_=dict(
                        price=price_val,
                        original_price=mrp_val if mrp_val > price_val else None,
                        discount_percent=discount,
                        discount_label=f"{int(discount)}% OFF" if discount > 0 else None,
                        is_available=item.get("in_stock", True),
                        platform_product_id=item.get("pid") or None,
                        platform_product_url=item.get("url") or None,
                        platform_image_url=item.get("image_url") or None,
                        last_updated=now,
                        source=item.get("source", "scrape"),
                    ),
                )
            )

            # Commit in batches of 100
            if (idx + 1) % 100 == 0:
                await db.commit()
                print(f"   ... {idx + 1}/{len(all_items)} processed (saved: {saved}, updated: {updated}, skipped: {skipped})")

        await db.commit()
        print(f"\n✅ Done!")
        print(f"   New products : {saved}")
        print(f"   Updated      : {updated}")
        print(f"   Skipped      : {skipped}")
        print(f"   Total items  : {len(all_items)}")

        # ── Mark all products with prices as featured ─────────────────────────
        print("\n🌟 Ensuring all products with prices are featured...")
        result = await db.execute(
            text("""
                UPDATE products SET is_featured = true
                WHERE is_active = true
                  AND id IN (
                      SELECT DISTINCT product_id FROM platform_prices
                      WHERE is_available = true
                  )
                  AND is_featured = false
            """)
        )
        await db.commit()
        featured_updated = result.rowcount if hasattr(result, 'rowcount') else 0
        print(f"   ✅ Marked {featured_updated} additional products as featured")

        # ── Final stats ───────────────────────────────────────────────────────
        total_products = (await db.execute(
            text("SELECT COUNT(*) FROM products WHERE is_active = true")
        )).scalar_one()
        total_featured = (await db.execute(
            text("SELECT COUNT(*) FROM products WHERE is_active = true AND is_featured = true")
        )).scalar_one()
        total_prices = (await db.execute(
            text("SELECT COUNT(*) FROM platform_prices WHERE is_available = true")
        )).scalar_one()

        print(f"\n📊 Database summary:")
        print(f"   Total active products : {total_products}")
        print(f"   Featured products     : {total_featured}")
        print(f"   Available prices      : {total_prices}")

    await engine.dispose()
    print("\n🎉 All done! Check pricebasket.in to see the live data.")


if __name__ == "__main__":
    asyncio.run(main())
