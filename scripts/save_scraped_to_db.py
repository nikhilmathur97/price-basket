#!/usr/bin/env python3
"""
save_scraped_to_db.py — Push scraped product data to the PriceBasket database.

Uses raw SQL (no ORM model imports) to avoid SQLAlchemy metadata conflicts.
Works with any Python environment that has sqlalchemy + asyncpg installed.

Usage:
    DATABASE_URL=postgresql+asyncpg://... python3 scripts/save_scraped_to_db.py
    python3 scripts/save_scraped_to_db.py --env backend/.env
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
                    help="Scraped JSON file")
parser.add_argument("--dry-run", action="store_true", help="Parse only, don't write to DB")
parser.add_argument("--limit", type=int, default=None, help="Limit number of items")
parser.add_argument("--platform", default=None, help="Only process this platform")
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
    print("❌  DATABASE_URL not set.")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

print(f"  DB: {db_url[:70]}...")


# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:100]


def extract_unit(name: str, existing_unit: str = "") -> str:
    if existing_unit and existing_unit.strip():
        return existing_unit.strip()
    patterns = [
        r'\b(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams|litre|liter|l|ml|ltr|ltrs|pcs|pc|pack|pk|pieces|piece|nos|no)\b',
        r'\b(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|ml|kg|l)\b',
        r'\b(\d+)\s*(tabs?|capsules?|sachets?|pouches?)\b',
    ]
    name_lower = name.lower()
    for pattern in patterns:
        m = re.search(pattern, name_lower)
        if m:
            return m.group(0).strip()
    return ""


def extract_brand(name: str) -> Optional[str]:
    known_brands = [
        "Amul", "Mother Dairy", "Nestle", "Britannia", "Parle", "Tata",
        "ITC", "HUL", "Dabur", "Marico", "Godrej", "Patanjali",
        "Haldiram", "Haldiram's", "Bikaji", "Bingo", "Lay's", "Lays",
        "Kurkure", "Maggi", "Sunfeast", "Yippee", "Cadbury", "Mondelez",
        "Coca-Cola", "Pepsi", "Sprite", "Fanta", "Limca", "Thums Up",
        "Tropicana", "Real", "Paper Boat", "Frooti", "Red Bull", "Monster",
        "Aashirvaad", "Pillsbury", "Nature Fresh", "India Gate", "Daawat",
        "Kohinoor", "Fortune", "Saffola", "Tata Sampann", "Tata Salt",
        "Catch", "Everest", "MDH", "MTR", "Surf Excel", "Ariel", "Tide",
        "Rin", "Vim", "Harpic", "Lizol", "Colin", "Domex", "Pril",
        "Dettol", "Savlon", "Lifebuoy", "Dove", "Lux", "Pears", "Santoor",
        "Head & Shoulders", "Pantene", "Sunsilk", "Clinic Plus", "Colgate",
        "Pepsodent", "Sensodyne", "Oral-B", "Vaseline", "Nivea", "Pond's",
        "Gillette", "Whisper", "Stayfree", "Himalaya", "Biotique",
        "Mamaearth", "WOW", "Johnson", "Johnson's", "Pampers", "Huggies",
        "Licious", "Country Delight", "Suguna", "Venky's", "Epigamia",
        "Kellogg's", "Quaker", "Horlicks", "Boost", "Complan", "Nescafe",
        "Bru", "Tata Tea", "Red Label", "Lipton", "Kissan", "Knorr",
    ]
    name_lower = name.lower()
    for brand in known_brands:
        if brand.lower() in name_lower:
            return brand
    return None


def guess_category(name: str, query: str) -> str:
    text = (name + " " + query).lower()
    rules = [
        (["pampers", "huggies", "diaper", "nappy", "cerelac", "nestum",
          "baby food", "johnson baby", "baby shampoo", "baby lotion"], "baby-care"),
        (["chicken", "mutton", "fish", "prawn", "shrimp", "licious", "meat",
          "seafood", "egg", "eggs"], "chicken-meat"),
        (["milk", "butter", "paneer", "curd", "dahi", "yogurt", "ghee", "cream",
          "cheese", "lassi", "buttermilk", "dairy", "horlicks", "boost", "complan",
          "nescafe", "coffee", "tea", "oats", "cornflakes", "muesli", "honey",
          "jam", "poha", "breakfast"], "dairy-breakfast"),
        (["onion", "tomato", "potato", "banana", "apple", "mango", "orange",
          "lemon", "lime", "spinach", "palak", "capsicum", "carrot", "cucumber",
          "cauliflower", "broccoli", "cabbage", "peas", "beans", "okra", "bhindi",
          "grapes", "watermelon", "papaya", "guava", "pineapple", "strawberry",
          "vegetable", "fruit", "fresh", "sabzi"], "fruits-vegetables"),
        (["oil", "ghee", "vanaspati", "turmeric", "haldi", "chilli", "chili",
          "masala", "pepper", "cumin", "jeera", "coriander", "dhania", "mustard",
          "cardamom", "clove", "cinnamon", "spice", "seasoning"], "oils-spices"),
        (["atta", "flour", "maida", "suji", "semolina", "besan", "rice", "dal",
          "lentil", "rajma", "chana", "moong", "urad", "salt", "sugar", "jaggery",
          "ketchup", "sauce", "pickle", "papad", "staple"], "staples"),
        (["lays", "chips", "kurkure", "bhujia", "namkeen", "biscuit", "cookie",
          "cracker", "wafer", "chocolate", "candy", "noodles", "pasta", "maggi",
          "cola", "pepsi", "sprite", "juice", "drink", "water", "soda",
          "energy drink", "redbull", "snack", "munch", "oreo"], "snacks-drinks"),
        (["bread", "bun", "pav", "cake", "muffin", "rusk", "toast",
          "bakery", "pastry"], "bakery"),
        (["soap", "shampoo", "conditioner", "face wash", "moisturizer", "lotion",
          "cream", "sunscreen", "deodorant", "toothpaste", "toothbrush",
          "mouthwash", "razor", "shaving", "sanitary", "pad", "tampon",
          "hair oil", "hair gel", "nail", "lipstick", "kajal", "eyeliner",
          "personal care", "skincare", "haircare", "oral care"], "personal-care"),
        (["detergent", "washing powder", "fabric", "dishwash", "dish wash",
          "toilet cleaner", "floor cleaner", "glass cleaner", "surface cleaner",
          "scrubber", "mop", "broom", "tissue", "napkin", "toilet paper",
          "household", "cleaning", "sanitizer", "disinfectant", "harpic",
          "lizol", "vim", "surf", "ariel", "tide"], "household"),
    ]
    for keywords, category in rules:
        for kw in keywords:
            if kw in text:
                return category
    return "snacks-drinks"


# ── Platform metadata ─────────────────────────────────────────────────────────
PLATFORM_META = {
    "blinkit":   {"name": "Blinkit",          "color_hex": "#0C831F", "avg_delivery_minutes": 10,  "delivery_fee": 25,  "free_delivery_threshold": 199},
    "zepto":     {"name": "Zepto",             "color_hex": "#8B2FC9", "avg_delivery_minutes": 8,   "delivery_fee": 20,  "free_delivery_threshold": 149},
    "instamart": {"name": "Swiggy Instamart",  "color_hex": "#FC8019", "avg_delivery_minutes": 15,  "delivery_fee": 30,  "free_delivery_threshold": 299},
    "bigbasket": {"name": "BigBasket",         "color_hex": "#84C225", "avg_delivery_minutes": 30,  "delivery_fee": 40,  "free_delivery_threshold": 500},
    "jiomart":   {"name": "JioMart Express",   "color_hex": "#0B3D91", "avg_delivery_minutes": 30,  "delivery_fee": 35,  "free_delivery_threshold": 399},
    "amazon":    {"name": "Amazon Fresh",      "color_hex": "#FF9900", "avg_delivery_minutes": 120, "delivery_fee": 40,  "free_delivery_threshold": 499},
    "flipkart":  {"name": "Flipkart Minutes",  "color_hex": "#2874F0", "avg_delivery_minutes": 10,  "delivery_fee": 20,  "free_delivery_threshold": 199},
}

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
    for candidate in [file_path, "/tmp/scraped_bulk.json", "/tmp/scraped_data.json"]:
        if os.path.exists(candidate):
            file_path = candidate
            break
    else:
        print(f"❌  File not found: {args.file}")
        sys.exit(1)

    with open(file_path) as f:
        all_items = json.load(f)

    if args.platform:
        all_items = [i for i in all_items if i.get("platform") == args.platform]
    if args.limit:
        all_items = all_items[:args.limit]

    print(f"\n📦 Loaded {len(all_items)} scraped items from {file_path}")

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

    # ── Connect to DB using raw asyncpg ──────────────────────────────────────
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)

    async with engine.begin() as conn:
        # ── Upsert platforms ──────────────────────────────────────────────────
        print("\n🔧 Upserting platforms...")
        for slug, meta in PLATFORM_META.items():
            await conn.execute(text("""
                INSERT INTO platforms (id, name, slug, color_hex, avg_delivery_minutes,
                    delivery_fee, free_delivery_threshold, is_active, scraping_enabled,
                    min_order_amount, created_at, updated_at)
                VALUES (:id, :name, :slug, :color_hex, :avg_delivery_minutes,
                    :delivery_fee, :free_delivery_threshold, true, true, 0,
                    NOW(), NOW())
                ON CONFLICT (slug) DO UPDATE SET
                    avg_delivery_minutes = EXCLUDED.avg_delivery_minutes,
                    color_hex = EXCLUDED.color_hex,
                    updated_at = NOW()
            """), {
                "id": str(uuid.uuid4()),
                "name": meta["name"],
                "slug": slug,
                "color_hex": meta["color_hex"],
                "avg_delivery_minutes": meta["avg_delivery_minutes"],
                "delivery_fee": meta["delivery_fee"],
                "free_delivery_threshold": meta["free_delivery_threshold"],
            })
            print(f"   ✓ {slug}")

        # ── Upsert categories ─────────────────────────────────────────────────
        print("\n🔧 Upserting categories...")
        for cat_slug, cat_meta in CATEGORIES.items():
            await conn.execute(text("""
                INSERT INTO categories (id, name, slug, icon, display_order, is_active, created_at)
                VALUES (:id, :name, :slug, :icon, :display_order, true, NOW())
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    icon = EXCLUDED.icon,
                    display_order = EXCLUDED.display_order
            """), {
                "id": str(uuid.uuid4()),
                "name": cat_meta["name"],
                "slug": cat_slug,
                "icon": cat_meta["icon"],
                "display_order": cat_meta["display_order"],
            })
            print(f"   ✓ {cat_slug}")

        # ── Load platform and category ID maps ────────────────────────────────
        plat_rows = await conn.execute(text("SELECT id, slug FROM platforms WHERE is_active = true"))
        platform_ids = {row[1]: row[0] for row in plat_rows.fetchall()}

        cat_rows = await conn.execute(text("SELECT id, slug FROM categories WHERE is_active = true"))
        category_ids = {row[1]: row[0] for row in cat_rows.fetchall()}

        print(f"\n   Platforms loaded: {list(platform_ids.keys())}")
        print(f"   Categories loaded: {list(category_ids.keys())}")

    # ── Save products + prices in batches ─────────────────────────────────────
    print(f"\n💾 Saving {len(all_items)} products to DB...")
    saved = 0
    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    # Cache: slug -> product_id
    seen_products: dict[str, str] = {}

    BATCH_SIZE = 100

    for batch_start in range(0, len(all_items), BATCH_SIZE):
        async with engine.begin() as conn:
            for idx, item in enumerate(all_items[batch_start:batch_start + BATCH_SIZE], start=batch_start):
                platform_slug = item.get("platform", "")
                platform_id = platform_ids.get(platform_slug)
                if not platform_id:
                    skipped += 1
                    continue

                name = re.sub(r"\s+", " ", (item.get("name") or "").strip())[:200]
                price = item.get("price")
                if not name or not price or float(price) <= 0 or float(price) > 50000:
                    skipped += 1
                    continue

                query = item.get("query", "")
                cat_slug = guess_category(name, query)
                category_id = category_ids.get(cat_slug) or category_ids.get("snacks-drinks")

                unit = extract_unit(name, item.get("unit", ""))
                brand = extract_brand(name)
                prod_slug = slugify(name)
                image_url = item.get("image_url") or None

                # Check product cache
                product_id = seen_products.get(prod_slug)
                if not product_id:
                    # Check DB
                    row = await conn.execute(
                        text("SELECT id FROM products WHERE slug = :slug"),
                        {"slug": prod_slug}
                    )
                    existing = row.fetchone()
                    if existing:
                        product_id = str(existing[0])
                        # Update missing fields.
                        # IMPORTANT: thumbnail_url must be kept in sync with image_url.
                        # The home page ProductCard cascades image_url → thumbnail_url →
                        # platform_image_url. If both product-level fields are NULL the
                        # card falls through to platform_image_url which causes a blank
                        # flash on first render. Always fill both from the scraped image.
                        await conn.execute(text("""
                            UPDATE products SET
                                is_featured = true,
                                image_url = COALESCE(NULLIF(image_url, ''), :image_url),
                                thumbnail_url = COALESCE(NULLIF(thumbnail_url, ''), :image_url),
                                unit = COALESCE(NULLIF(unit, ''), :unit),
                                brand = COALESCE(NULLIF(brand, ''), :brand),
                                updated_at = NOW()
                            WHERE id = :id
                              AND :image_url IS NOT NULL
                        """), {
                            "id": product_id,
                            "image_url": image_url,
                            "unit": unit or None,
                            "brand": brand,
                        })
                        # Also run a separate update for non-image fields when image_url is null
                        if not image_url:
                            await conn.execute(text("""
                                UPDATE products SET
                                    is_featured = true,
                                    unit = COALESCE(NULLIF(unit, ''), :unit),
                                    brand = COALESCE(NULLIF(brand, ''), :brand),
                                    updated_at = NOW()
                                WHERE id = :id
                            """), {
                                "id": product_id,
                                "unit": unit or None,
                                "brand": brand,
                            })
                        updated += 1
                    else:
                        # Insert new product.
                        # thumbnail_url is set to image_url so the home page ProductCard
                        # always has a usable image on the very first render (no blank flash).
                        product_id = str(uuid.uuid4())
                        desc = f"{name} — Compare prices across Blinkit, Zepto, BigBasket, Instamart and more."
                        await conn.execute(text("""
                            INSERT INTO products (id, name, slug, brand, unit, description,
                                category_id, image_url, thumbnail_url, is_active, is_featured,
                                created_at, updated_at)
                            VALUES (:id, :name, :slug, :brand, :unit, :description,
                                :category_id, :image_url, :thumbnail_url, true, true,
                                NOW(), NOW())
                            ON CONFLICT (slug) DO UPDATE SET
                                is_featured = true,
                                image_url = COALESCE(NULLIF(products.image_url, ''), EXCLUDED.image_url),
                                thumbnail_url = COALESCE(NULLIF(products.thumbnail_url, ''), EXCLUDED.thumbnail_url),
                                updated_at = NOW()
                            RETURNING id
                        """), {
                            "id": product_id,
                            "name": name,
                            "slug": prod_slug,
                            "brand": brand,
                            "unit": unit or None,
                            "description": desc,
                            "category_id": category_id,
                            "image_url": image_url,
                            "thumbnail_url": image_url,   # mirror image_url into thumbnail_url
                        })
                        saved += 1

                    seen_products[prod_slug] = product_id

                # Upsert platform price
                price_val = float(price)
                mrp_val = float(item.get("mrp") or price)
                if mrp_val < price_val:
                    mrp_val = price_val
                discount = round((mrp_val - price_val) / mrp_val * 100, 1) if mrp_val > price_val else 0.0
                discount_label = f"{int(discount)}% OFF" if discount > 0 else None

                await conn.execute(text("""
                    INSERT INTO platform_prices (id, product_id, platform_id, price,
                        original_price, discount_percent, discount_label, is_available,
                        delivery_time_minutes, platform_product_id, platform_product_url,
                        platform_image_url, last_updated, source)
                    VALUES (:id, :product_id, :platform_id, :price,
                        :original_price, :discount_percent, :discount_label, :is_available,
                        :delivery_time_minutes, :platform_product_id, :platform_product_url,
                        :platform_image_url, :last_updated, :source)
                    ON CONFLICT ON CONSTRAINT uq_platform_prices_product_platform DO UPDATE SET
                        price = EXCLUDED.price,
                        original_price = EXCLUDED.original_price,
                        discount_percent = EXCLUDED.discount_percent,
                        discount_label = EXCLUDED.discount_label,
                        is_available = EXCLUDED.is_available,
                        platform_product_id = COALESCE(EXCLUDED.platform_product_id, platform_prices.platform_product_id),
                        platform_product_url = COALESCE(EXCLUDED.platform_product_url, platform_prices.platform_product_url),
                        platform_image_url = COALESCE(EXCLUDED.platform_image_url, platform_prices.platform_image_url),
                        last_updated = EXCLUDED.last_updated,
                        source = EXCLUDED.source
                """), {
                    "id": str(uuid.uuid4()),
                    "product_id": product_id,
                    "platform_id": platform_id,
                    "price": price_val,
                    "original_price": mrp_val if mrp_val > price_val else None,
                    "discount_percent": discount,
                    "discount_label": discount_label,
                    "is_available": item.get("in_stock", True),
                    "delivery_time_minutes": PLATFORM_META.get(platform_slug, {}).get("avg_delivery_minutes"),
                    "platform_product_id": item.get("pid") or None,
                    "platform_product_url": item.get("url") or None,
                    "platform_image_url": image_url,
                    "last_updated": now,
                    "source": item.get("source", "scrape"),
                })

            print(f"   ... {min(batch_start + BATCH_SIZE, len(all_items))}/{len(all_items)} processed (new: {saved}, updated: {updated}, skipped: {skipped})")

    print(f"\n✅ Done!")
    print(f"   New products : {saved}")
    print(f"   Updated      : {updated}")
    print(f"   Skipped      : {skipped}")
    print(f"   Total items  : {len(all_items)}")

    # ── Mark all products with prices as featured ─────────────────────────────
    print("\n🌟 Marking all products with prices as featured...")
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            UPDATE products SET is_featured = true
            WHERE is_active = true
              AND id IN (
                  SELECT DISTINCT product_id FROM platform_prices
                  WHERE is_available = true
              )
              AND is_featured = false
        """))
        print(f"   ✅ Marked {result.rowcount} additional products as featured")

        # Final stats
        total_products = (await conn.execute(
            text("SELECT COUNT(*) FROM products WHERE is_active = true")
        )).scalar()
        total_featured = (await conn.execute(
            text("SELECT COUNT(*) FROM products WHERE is_active = true AND is_featured = true")
        )).scalar()
        total_prices = (await conn.execute(
            text("SELECT COUNT(*) FROM platform_prices WHERE is_available = true")
        )).scalar()

        print(f"\n📊 Database summary:")
        print(f"   Total active products : {total_products}")
        print(f"   Featured products     : {total_featured}")
        print(f"   Available prices      : {total_prices}")

    await engine.dispose()
    print("\n🎉 All done! Check pricebasket.in to see the live data.")


if __name__ == "__main__":
    asyncio.run(main())
