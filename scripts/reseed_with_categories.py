#!/usr/bin/env python3
"""
Re-seed /tmp/scraped_data.json into the DB with correct category mapping.
Uses raw asyncpg — no app model imports, works with Python 3.9.
"""
import asyncio
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
for ep in ["backend/.env", ".env"]:
    if os.path.exists(ep):
        load_dotenv(ep)
        break

import asyncpg

# ── Query → Category slug mapping ─────────────────────────────────────────────
QUERY_CATEGORY_MAP = {
    # Dairy & Breakfast
    "milk": "dairy-breakfast", "butter": "dairy-breakfast", "eggs": "dairy-breakfast",
    "yogurt curd": "dairy-breakfast", "cheese": "dairy-breakfast", "paneer": "dairy-breakfast",
    "cream": "dairy-breakfast", "cornflakes cereal": "dairy-breakfast", "oats": "dairy-breakfast",
    "muesli": "dairy-breakfast",
    # Staples
    "rice": "staples", "atta wheat flour": "staples", "sugar": "staples", "salt": "staples",
    "dal lentils": "staples", "chana dal": "staples", "urad dal": "staples",
    "moong dal": "staples", "poha": "staples", "suji semolina": "staples",
    "besan gram flour": "staples", "rajma kidney beans": "staples",
    # Oils & Spices
    "cooking oil": "oils-spices", "ghee": "oils-spices", "mustard oil": "oils-spices",
    "olive oil": "oils-spices", "honey": "oils-spices", "turmeric haldi": "oils-spices",
    "cumin jeera": "oils-spices", "coriander powder dhania": "oils-spices",
    "garam masala": "oils-spices", "red chilli powder": "oils-spices",
    "black pepper": "oils-spices",
    # Fruits & Vegetables
    "tomato": "fruits-vegetables", "onion": "fruits-vegetables", "potato": "fruits-vegetables",
    "banana": "fruits-vegetables", "apple": "fruits-vegetables",
    "spinach palak": "fruits-vegetables", "capsicum shimla mirch": "fruits-vegetables",
    "carrot gajar": "fruits-vegetables", "cucumber kheera": "fruits-vegetables",
    "garlic lehsun": "fruits-vegetables", "ginger adrak": "fruits-vegetables",
    "green chilli": "fruits-vegetables", "coriander dhania leaves": "fruits-vegetables",
    "pineapple": "fruits-vegetables", "watermelon": "fruits-vegetables",
    "grapes": "fruits-vegetables", "pomegranate anaar": "fruits-vegetables",
    "cauliflower": "fruits-vegetables", "brinjal baingan": "fruits-vegetables",
    "bhindi lady finger": "fruits-vegetables", "methi fenugreek": "fruits-vegetables",
    "peas matar": "fruits-vegetables", "radish mooli": "fruits-vegetables",
    "lemon nimbu": "fruits-vegetables",
    # Snacks & Drinks
    "biscuits": "snacks-drinks", "chips": "snacks-drinks", "noodles": "snacks-drinks",
    "cold drink cola": "snacks-drinks", "mango juice": "snacks-drinks",
    "energy drink": "snacks-drinks", "nachos": "snacks-drinks", "popcorn": "snacks-drinks",
    "namkeen mixture": "snacks-drinks", "dry fruits": "snacks-drinks",
    "cashew nuts": "snacks-drinks", "almonds": "snacks-drinks", "peanuts": "snacks-drinks",
    "chocolate": "snacks-drinks", "candy": "snacks-drinks",
    "tea": "snacks-drinks", "coffee": "snacks-drinks", "green tea": "snacks-drinks",
    "protein shake": "snacks-drinks",
    # Bakery
    "bread": "bakery", "pav bun": "bakery", "cake rusk": "bakery",
    # Personal Care
    "soap": "personal-care", "shampoo": "personal-care", "toothpaste": "personal-care",
    "body lotion": "personal-care", "face wash": "personal-care", "face cream": "personal-care",
    "deodorant": "personal-care", "razor": "personal-care", "baby powder": "personal-care",
    "sunscreen": "personal-care", "lip balm": "personal-care", "hand wash": "personal-care",
    # Household
    "detergent": "household", "dishwash bar": "household", "floor cleaner": "household",
    "toilet cleaner": "household", "antiseptic liquid dettol": "household",
    "scrub pad": "household", "air freshener": "household",
    "mosquito repellent": "household", "garbage bags": "household",
    "tissue paper": "household",
    # Chicken & Meat
    "chicken breast boneless": "chicken-meat", "chicken curry cut": "chicken-meat",
    "mutton keema": "chicken-meat", "chicken wings": "chicken-meat",
    # Frozen Foods
    "frozen peas": "frozen-foods", "french fries frozen": "frozen-foods",
    "ice cream": "frozen-foods", "frozen corn": "frozen-foods",
    "frozen vegetables mix": "frozen-foods",
    # Baby Care
    "diapers pampers": "baby-care", "baby food cerelac": "baby-care",
    "baby shampoo johnson": "baby-care", "baby oil": "baby-care",
    # Pet Care
    "dog food pedigree": "pet-care", "cat food whiskas": "pet-care",
    "pet treats": "pet-care",
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def get_dsn(db_url: str) -> str:
    """Convert SQLAlchemy URL to asyncpg DSN."""
    url = db_url
    for prefix in ["postgresql+asyncpg://", "postgresql+psycopg2://"]:
        if url.startswith(prefix):
            url = "postgresql://" + url[len(prefix):]
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


async def reseed():
    # Load scraped data
    json_path = "/tmp/scraped_data.json"
    if not os.path.exists(json_path):
        print(f"❌ {json_path} not found — scraper hasn't finished yet")
        return

    with open(json_path) as f:
        data = json.load(f)
    print(f"📦 Loaded {len(data)} records from {json_path}")

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("❌ No DATABASE_URL in environment")
        return

    dsn = get_dsn(db_url)
    conn = await asyncpg.connect(dsn)

    try:
        # Load platforms: slug → id
        rows = await conn.fetch("SELECT id, slug FROM platforms")
        platforms = {r["slug"]: str(r["id"]) for r in rows}
        print(f"✅ Platforms: {list(platforms.keys())}")

        # Load categories: slug → id
        rows = await conn.fetch("SELECT id, slug FROM categories")
        cat_map = {r["slug"]: str(r["id"]) for r in rows}
        print(f"✅ Categories: {list(cat_map.keys())}")

        # Fallback category
        fallback_cat_id = (
            cat_map.get("staples")
            or cat_map.get("dairy-breakfast")
            or list(cat_map.values())[0]
        )

        saved = 0
        new_products = 0
        cat_fixes = 0
        now = datetime.now(timezone.utc)

        for item in data:
            plat_id = platforms.get(item["platform"])
            if not plat_id:
                continue

            name = item["name"][:200]
            slug = slugify(name)[:100]
            query = item.get("query", "")
            cat_slug = QUERY_CATEGORY_MAP.get(query, "")
            cat_id = cat_map.get(cat_slug) or fallback_cat_id

            # Upsert product
            existing = await conn.fetchrow(
                "SELECT id, category_id FROM products WHERE slug = $1", slug
            )
            if existing:
                prod_id = str(existing["id"])
                # Fix category if needed
                if str(existing["category_id"]) != cat_id:
                    await conn.execute(
                        "UPDATE products SET category_id = $1 WHERE id = $2",
                        uuid.UUID(cat_id), uuid.UUID(prod_id)
                    )
                    cat_fixes += 1
            else:
                prod_id = str(uuid.uuid4())
                await conn.execute(
                    """INSERT INTO products (id, name, slug, category_id, image_url,
                       is_active, is_featured, created_at, updated_at)
                       VALUES ($1,$2,$3,$4,$5,true,true,$6,$6)""",
                    uuid.UUID(prod_id), name, slug, uuid.UUID(cat_id),
                    item.get("image_url", ""), now
                )
                new_products += 1

            # Upsert platform_price
            existing_pp = await conn.fetchrow(
                "SELECT id FROM platform_prices WHERE product_id=$1 AND platform_id=$2",
                uuid.UUID(prod_id), uuid.UUID(plat_id)
            )
            price = float(item["price"])
            mrp = float(item.get("mrp") or price)
            is_available = bool(item.get("in_stock", True))

            if existing_pp:
                await conn.execute(
                    """UPDATE platform_prices SET price=$1, original_price=$2,
                       is_available=$3, last_updated=$4
                       WHERE product_id=$5 AND platform_id=$6""",
                    price, mrp, is_available, now,
                    uuid.UUID(prod_id), uuid.UUID(plat_id)
                )
            else:
                await conn.execute(
                    """INSERT INTO platform_prices
                       (id, product_id, platform_id, price, original_price,
                        is_available, last_updated)
                       VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                    uuid.uuid4(), uuid.UUID(prod_id), uuid.UUID(plat_id),
                    price, mrp, is_available, now
                )
            saved += 1

            if saved % 500 == 0:
                print(f"  ... {saved} processed ({new_products} new products)")

        print(f"\n✅ Done!")
        print(f"   Price rows saved : {saved}")
        print(f"   New products     : {new_products}")
        print(f"   Category fixes   : {cat_fixes}")

        # Final DB summary
        total_products = await conn.fetchval("SELECT COUNT(*) FROM products")
        total_prices = await conn.fetchval("SELECT COUNT(*) FROM platform_prices")
        print(f"\n{'═'*52}")
        print(f"  DATABASE SUMMARY")
        print(f"{'═'*52}")
        print(f"  Total products  : {total_products}")
        print(f"  Total price rows: {total_prices}")
        print()

        rows = await conn.fetch("""
            SELECT c.name, COUNT(p.id) as cnt
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.name ORDER BY cnt DESC
        """)
        print("  Products per category:")
        for r in rows:
            status = "✅" if r["cnt"] > 0 else "❌"
            bar = "█" * min(int(r["cnt"] / 10), 25)
            print(f"  {status} {r['name']:<28} {r['cnt']:>4}  {bar}")

        print()
        rows = await conn.fetch("""
            SELECT pl.name, COUNT(pp.id) as cnt
            FROM platforms pl
            LEFT JOIN platform_prices pp ON pp.platform_id = pl.id
            GROUP BY pl.name ORDER BY cnt DESC
        """)
        print("  Price rows per platform:")
        for r in rows:
            status = "✅" if r["cnt"] > 0 else "❌"
            print(f"  {status} {r['name']:<28} {r['cnt']:>4}")
        print(f"{'═'*52}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(reseed())
