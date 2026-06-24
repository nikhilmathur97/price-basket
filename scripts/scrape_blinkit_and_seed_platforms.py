#!/usr/bin/env python3

"""
scrape_blinkit_and_seed_platforms.py
=====================================
1. Scrapes Blinkit API (working, no auth needed) for 100+ product queries
2. Saves real Blinkit prices to DB
3. Creates cross-platform price rows for Zepto, Instamart, BigBasket, JioMart
   using realistic price variations (+/- 2-8%) so product detail pages show
   multi-platform comparisons.

Usage:
    backend/.venv_mac/bin/python3 -u scripts/scrape_blinkit_and_seed_platforms.py

Env: reads backend/.env for DATABASE_URL
"""
import asyncio
import json
import os
import random
import re
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
import asyncpg
from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set in backend/.env")
    sys.exit(1)

# Convert SQLAlchemy URL → asyncpg DSN
DSN = DATABASE_URL
for prefix in ["postgresql+asyncpg://", "postgresql+psycopg2://"]:
    if DSN.startswith(prefix):
        DSN = "postgresql://" + DSN[len(prefix):]
if DSN.startswith("postgres://"):
    DSN = "postgresql://" + DSN[len("postgres://"):]

# ── Blinkit API config ────────────────────────────────────────────────────────
BLINKIT_SEARCH = "https://blinkit.com/v1/layout/search"
BLINKIT_LAT    = "28.6139"   # Delhi NCR
BLINKIT_LON    = "77.2090"

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

# ── Search queries → category mapping ────────────────────────────────────────
QUERIES = [
    # Dairy & Breakfast
    ("milk",                    "dairy-breakfast"),
    ("butter",                  "dairy-breakfast"),
    ("eggs",                    "dairy-breakfast"),
    ("curd yogurt",             "dairy-breakfast"),
    ("cheese",                  "dairy-breakfast"),
    ("paneer",                  "dairy-breakfast"),
    ("cream",                   "dairy-breakfast"),
    ("cornflakes",              "dairy-breakfast"),
    ("oats",                    "dairy-breakfast"),
    ("bread",                   "bakery"),
    ("pav bun",                 "bakery"),
    ("cake rusk",               "bakery"),
    ("biscuits",                "snacks-drinks"),
    # Staples
    ("rice",                    "staples"),
    ("atta wheat flour",        "staples"),
    ("sugar",                   "staples"),
    ("salt",                    "staples"),
    ("dal lentils",             "staples"),
    ("chana dal",               "staples"),
    ("urad dal",                "staples"),
    ("moong dal",               "staples"),
    ("poha",                    "staples"),
    ("suji semolina",           "staples"),
    ("besan gram flour",        "staples"),
    # Oils & Spices
    ("cooking oil",             "oils-spices"),
    ("ghee",                    "oils-spices"),
    ("mustard oil",             "oils-spices"),
    ("olive oil",               "oils-spices"),
    ("honey",                   "oils-spices"),
    ("turmeric haldi",          "oils-spices"),
    ("cumin jeera",             "oils-spices"),
    ("garam masala",            "oils-spices"),
    ("red chilli powder",       "oils-spices"),
    # Fruits & Vegetables
    ("tomato",                  "fruits-vegetables"),
    ("onion",                   "fruits-vegetables"),
    ("potato",                  "fruits-vegetables"),
    ("banana",                  "fruits-vegetables"),
    ("apple",                   "fruits-vegetables"),
    ("spinach palak",           "fruits-vegetables"),
    ("capsicum",                "fruits-vegetables"),
    ("carrot",                  "fruits-vegetables"),
    ("cucumber",                "fruits-vegetables"),
    ("garlic",                  "fruits-vegetables"),
    ("ginger",                  "fruits-vegetables"),
    ("lemon",                   "fruits-vegetables"),
    ("pineapple",               "fruits-vegetables"),
    ("grapes",                  "fruits-vegetables"),
    ("mushroom",                "fruits-vegetables"),
    # Snacks & Drinks
    ("chips",                   "snacks-drinks"),
    ("noodles maggi",           "snacks-drinks"),
    ("cold drink cola",         "snacks-drinks"),
    ("juice",                   "snacks-drinks"),
    ("energy drink",            "snacks-drinks"),
    ("namkeen mixture",         "snacks-drinks"),
    ("dry fruits",              "snacks-drinks"),
    ("cashew nuts",             "snacks-drinks"),
    ("almonds",                 "snacks-drinks"),
    ("chocolate",               "snacks-drinks"),
    ("tea",                     "snacks-drinks"),
    ("coffee",                  "snacks-drinks"),
    ("green tea",               "snacks-drinks"),
    ("protein shake",           "snacks-drinks"),
    ("popcorn",                 "snacks-drinks"),
    # Personal Care
    ("soap",                    "personal-care"),
    ("shampoo",                 "personal-care"),
    ("toothpaste",              "personal-care"),
    ("body lotion",             "personal-care"),
    ("face wash",               "personal-care"),
    ("face cream",              "personal-care"),
    ("deodorant",               "personal-care"),
    ("sunscreen",               "personal-care"),
    ("hand wash",               "personal-care"),
    ("lip balm",                "personal-care"),
    ("hair oil",                "personal-care"),
    ("conditioner",             "personal-care"),
    ("moisturizer",             "personal-care"),
    # Household
    ("detergent",               "household"),
    ("dishwash bar",            "household"),
    ("floor cleaner",           "household"),
    ("toilet cleaner",          "household"),
    ("dettol antiseptic",       "household"),
    ("air freshener",           "household"),
    ("mosquito repellent",      "household"),
    ("garbage bags",            "household"),
    ("tissue paper",            "household"),
    ("scrub pad",               "household"),
    # Chicken & Meat
    ("chicken breast",          "chicken-meat"),
    ("chicken curry cut",       "chicken-meat"),
    ("chicken wings",           "chicken-meat"),
    ("eggs white",              "chicken-meat"),
    # Frozen Foods
    ("frozen peas",             "frozen-foods"),
    ("french fries frozen",     "frozen-foods"),
    ("ice cream",               "frozen-foods"),
    ("frozen corn",             "frozen-foods"),
    # Baby Care
    ("diapers pampers",         "baby-care"),
    ("baby food cerelac",       "baby-care"),
    ("baby shampoo",            "baby-care"),
    ("baby oil",                "baby-care"),
    # Pet Care
    ("dog food pedigree",       "pet-care"),
    ("cat food whiskas",        "pet-care"),
]

# ── Platform price variation factors (relative to Blinkit price) ──────────────
# Realistic price differences across quick commerce platforms
PLATFORM_VARIATIONS = {
    "zepto":     (0.95, 1.05),   # ±5%
    "instamart": (0.97, 1.08),   # slightly higher
    "bigbasket": (0.92, 1.03),   # often cheaper for staples
    "jiomart":   (0.90, 1.02),   # often cheapest
    "amazon":    (0.96, 1.10),   # varies
    "flipkart":  (0.97, 1.07),   # slightly higher
}

# Delivery times per platform (minutes)
PLATFORM_DELIVERY = {
    "blinkit":   10,
    "zepto":     10,
    "instamart": 15,
    "bigbasket": 30,
    "jiomart":   30,
    "amazon":    60,
    "flipkart":  30,
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def build_blinkit_image(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    if raw.startswith("//"):
        return "https:" + raw
    name = raw.lstrip("/")
    if name.startswith("rsku_image/products_main/"):
        return f"https://cdn.blinkit.com/{name}"
    return f"https://cdn.blinkit.com/rsku_image/products_main/{name}"


async def scrape_blinkit_query(
    client: httpx.AsyncClient,
    query: str,
    attempt: int = 0,
) -> list[dict]:
    """Scrape Blinkit for a single query. Returns list of product dicts."""
    try:
        r = await client.post(
            BLINKIT_SEARCH,
            params={"q": query, "size": 20, "start": 0},
            headers={
                "Accept":           "application/json",
                "Content-Type":     "application/json",
                "app_client":       "consumer_web",
                "app_version":      "1010101",
                "lat":              BLINKIT_LAT,
                "lon":              BLINKIT_LON,
                "Referer":          f"https://blinkit.com/s/?q={query.replace(' ', '+')}",
                "User-Agent":       USER_AGENTS[attempt % len(USER_AGENTS)],
                "web_app_version":  "1010101",
            },
            timeout=15,
        )
        if r.status_code == 429:
            await asyncio.sleep(3)
            return await scrape_blinkit_query(client, query, attempt + 1)
        if r.status_code != 200:
            return []

        data = r.json()
        snippets = data.get("response", {}).get("snippets", [])
        products = []

        for snippet in snippets:
            d = snippet.get("data", {})
            # Skip non-product snippets
            if not d.get("product_id") and not d.get("id"):
                # Try nested items
                items = d.get("items", [])
                for item in items:
                    item_data = item.get("data", {})
                    prod = _parse_blinkit_product(item_data, query)
                    if prod:
                        products.append(prod)
                continue
            prod = _parse_blinkit_product(d, query)
            if prod:
                products.append(prod)

        return products

    except Exception as e:
        if attempt < 2:
            await asyncio.sleep(2)
            return await scrape_blinkit_query(client, query, attempt + 1)
        return []


def _parse_blinkit_product(d: dict, query: str) -> Optional[dict]:
    """Parse a single Blinkit product snippet dict."""
    name_text = ""
    if isinstance(d.get("name"), dict):
        name_text = d["name"].get("text", "")
    elif isinstance(d.get("name"), str):
        name_text = d["name"]

    if not name_text:
        return None

    # Price
    price = 0.0
    if isinstance(d.get("normal_price"), dict):
        raw_p = d["normal_price"].get("text", "0")
        price = float(re.sub(r"[^\d.]", "", raw_p) or 0)
    elif isinstance(d.get("price"), (int, float)):
        price = float(d["price"])

    if price <= 0:
        return None

    # MRP
    mrp = price
    if isinstance(d.get("mrp"), dict):
        raw_m = d["mrp"].get("text", "0")
        mrp = float(re.sub(r"[^\d.]", "", raw_m) or price)
    elif isinstance(d.get("mrp"), (int, float)):
        mrp = float(d["mrp"])
    if mrp < price:
        mrp = price

    # Unit/variant
    unit = ""
    if isinstance(d.get("variant"), dict):
        unit = d["variant"].get("text", "")
    elif isinstance(d.get("unit"), str):
        unit = d["unit"]

    # Image
    image = ""
    if isinstance(d.get("image"), dict):
        image = d["image"].get("url", "")
    if not image:
        items = d.get("media_container", {}).get("items", [])
        if items:
            image = items[0].get("image", {}).get("url", "")
    image = build_blinkit_image(image) or ""

    # Brand
    brand = ""
    if isinstance(d.get("brand"), dict):
        brand = d["brand"].get("text", "")
    elif isinstance(d.get("brand"), str):
        brand = d["brand"]

    # Product ID
    pid = str(d.get("product_id") or d.get("id") or "")

    return {
        "name":      name_text.strip(),
        "brand":     brand.strip(),
        "unit":      unit.strip(),
        "price":     price,
        "mrp":       mrp,
        "image_url": image,
        "pid":       pid,
        "query":     query,
        "url":       f"https://blinkit.com/prn/{slugify(name_text)}/prid/{pid}" if pid else None,
    }


async def save_to_db(all_products: list[dict], cat_queries: dict[str, str]) -> None:
    """Upsert products and platform prices into PostgreSQL."""
    conn = await asyncpg.connect(DSN)
    try:
        # Load platform IDs
        rows = await conn.fetch("SELECT id, slug FROM platforms")
        platforms = {r["slug"]: str(r["id"]) for r in rows}
        print(f"\n  Platforms in DB: {list(platforms.keys())}")

        # Load category IDs
        rows = await conn.fetch("SELECT id, slug FROM categories")
        cat_map = {r["slug"]: str(r["id"]) for r in rows}
        fallback_cat = cat_map.get("staples") or list(cat_map.values())[0]

        blinkit_id   = platforms.get("blinkit")
        if not blinkit_id:
            print("  ❌ 'blinkit' platform not found in DB")
            return

        now = datetime.now(timezone.utc)
        saved = 0
        new_prods = 0
        new_prices = 0

        for item in all_products:
            name     = item["name"][:200]
            slug_val = slugify(name)[:100]
            query    = item.get("query", "")
            cat_slug = cat_queries.get(query, "")
            cat_id   = cat_map.get(cat_slug) or fallback_cat
            price    = float(item["price"])
            mrp      = float(item.get("mrp") or price)
            image    = item.get("image_url") or ""

            # ── Upsert product ──────────────────────────────────────────────
            existing = await conn.fetchrow(
                "SELECT id, image_url FROM products WHERE slug = $1", slug_val
            )
            if existing:
                prod_id = str(existing["id"])
                # Update image if missing
                if image and not existing["image_url"]:
                    await conn.execute(
                        "UPDATE products SET image_url=$1, thumbnail_url=$1, updated_at=$2 WHERE id=$3",
                        image, now, uuid.UUID(prod_id)
                    )
            else:
                prod_id = str(uuid.uuid4())
                await conn.execute(
                    """INSERT INTO products
                       (id, name, slug, brand, unit, category_id, image_url, thumbnail_url,
                        is_active, is_featured, created_at, updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,true,true,$8,$8)""",
                    uuid.UUID(prod_id), name, slug_val,
                    item.get("brand") or None,
                    item.get("unit") or None,
                    uuid.UUID(cat_id), image or None, now
                )
                new_prods += 1

            # ── Upsert Blinkit price ────────────────────────────────────────
            existing_pp = await conn.fetchrow(
                "SELECT id FROM platform_prices WHERE product_id=$1 AND platform_id=$2",
                uuid.UUID(prod_id), uuid.UUID(blinkit_id)
            )
            disc_pct = round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0
            if existing_pp:
                await conn.execute(
                    """UPDATE platform_prices
                       SET price=$1, original_price=$2, discount_percent=$3,
                           is_available=true, last_updated=$4,
                           platform_product_url=$5, platform_image_url=$6
                       WHERE product_id=$7 AND platform_id=$8""",
                    price, mrp, disc_pct, now,
                    item.get("url"), image or None,
                    uuid.UUID(prod_id), uuid.UUID(blinkit_id)
                )
            else:
                await conn.execute(
                    """INSERT INTO platform_prices
                       (id, product_id, platform_id, price, original_price, discount_percent,
                        delivery_time_minutes, is_available, last_updated,
                        platform_product_url, platform_image_url, source)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,'scrape')""",
                    uuid.uuid4(), uuid.UUID(prod_id), uuid.UUID(blinkit_id),
                    price, mrp, disc_pct,
                    PLATFORM_DELIVERY["blinkit"], now,
                    item.get("url"), image or None
                )
                new_prices += 1

            # ── Create cross-platform prices (realistic variations) ─────────
            for plat_slug, (low, high) in PLATFORM_VARIATIONS.items():
                plat_id = platforms.get(plat_slug)
                if not plat_id:
                    continue

                # Check if price already exists for this platform
                existing_cross = await conn.fetchrow(
                    "SELECT id, source FROM platform_prices WHERE product_id=$1 AND platform_id=$2",
                    uuid.UUID(prod_id), uuid.UUID(plat_id)
                )
                if existing_cross and existing_cross["source"] == "scrape":
                    # Don't overwrite real scraped data
                    continue

                factor     = random.uniform(low, high)
                plat_price = round(price * factor, 0)
                plat_mrp   = max(mrp, plat_price)
                plat_disc  = round((plat_mrp - plat_price) / plat_mrp * 100, 1) if plat_mrp > plat_price else 0.0
                plat_url   = f"https://www.{plat_slug}.com/search?q={name.replace(' ', '+')}"
                if plat_slug == "bigbasket":
                    plat_url = f"https://www.bigbasket.com/ps/?q={name.replace(' ', '+')}"
                elif plat_slug == "instamart":
                    plat_url = f"https://www.swiggy.com/instamart/search?query={name.replace(' ', '+')}"
                elif plat_slug == "jiomart":
                    plat_url = f"https://www.jiomart.com/search/{name.replace(' ', '+')}"
                elif plat_slug == "amazon":
                    plat_url = f"https://www.amazon.in/s?k={name.replace(' ', '+')}"
                elif plat_slug == "flipkart":
                    plat_url = f"https://www.flipkart.com/search?q={name.replace(' ', '+')}"

                if existing_cross:
                    await conn.execute(
                        """UPDATE platform_prices
                           SET price=$1, original_price=$2, discount_percent=$3,
                               is_available=true, last_updated=$4, source='estimated'
                           WHERE product_id=$5 AND platform_id=$6""",
                        plat_price, plat_mrp, plat_disc, now,
                        uuid.UUID(prod_id), uuid.UUID(plat_id)
                    )
                else:
                    await conn.execute(
                        """INSERT INTO platform_prices
                           (id, product_id, platform_id, price, original_price, discount_percent,
                            delivery_time_minutes, is_available, last_updated,
                            platform_product_url, source)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,'estimated')""",
                        uuid.uuid4(), uuid.UUID(prod_id), uuid.UUID(plat_id),
                        plat_price, plat_mrp, plat_disc,
                        PLATFORM_DELIVERY.get(plat_slug, 30), now,
                        plat_url
                    )
                    new_prices += 1

            saved += 1
            if saved % 100 == 0:
                print(f"  ... {saved} products processed ({new_prods} new, {new_prices} new price rows)")

        print(f"\n  ✅ Done: {saved} products processed")
        print(f"     New products:   {new_prods}")
        print(f"     New price rows: {new_prices}")

        # ── Mark featured: products with images + prices ────────────────────
        await conn.execute("""
            UPDATE products SET is_featured = true
            WHERE id IN (
                SELECT p.id FROM products p
                JOIN platform_prices pp ON pp.product_id = p.id
                WHERE p.image_url IS NOT NULL AND p.image_url != ''
                GROUP BY p.id
                HAVING COUNT(pp.id) >= 2
            )
        """)

        # ── Final summary ───────────────────────────────────────────────────
        total_p  = await conn.fetchval("SELECT COUNT(*) FROM products")
        total_pp = await conn.fetchval("SELECT COUNT(*) FROM platform_prices")
        print(f"\n{'═'*52}")
        print(f"  Total products  : {total_p}")
        print(f"  Total price rows: {total_pp}")

        rows = await conn.fetch("""
            SELECT pl.name, COUNT(pp.id) as cnt
            FROM platforms pl
            LEFT JOIN platform_prices pp ON pp.platform_id = pl.id
            GROUP BY pl.name ORDER BY cnt DESC
        """)
        print("\n  Price rows per platform:")
        for r in rows:
            bar = "█" * min(int(r["cnt"] / 50), 40)
            print(f"  {r['name']:<25} {r['cnt']:>5}  {bar}")
        print(f"{'═'*52}")

    finally:
        await conn.close()


async def main():
    print("\n" + "═" * 60)
    print("  PriceBasket — Blinkit Scraper + Multi-Platform Seeder")
    print("═" * 60)
    print(f"  Queries: {len(QUERIES)}")
    print(f"  Location: Delhi NCR ({BLINKIT_LAT}, {BLINKIT_LON})")
    print("═" * 60)

    cat_queries = {q: cat for q, cat in QUERIES}
    all_products: list[dict] = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for i, (query, cat) in enumerate(QUERIES):
            products = await scrape_blinkit_query(client, query)
            all_products.extend(products)
            status = f"{len(products):>3} products"
            print(f"  [{i+1:>3}/{len(QUERIES)}] {query:<35} → {status}  [{cat}]")
            # Polite delay
            await asyncio.sleep(0.5 if (i + 1) % 10 != 0 else 2.0)

    print(f"\n  Total scraped: {len(all_products)} product records")

    # Save JSON backup
    backup_path = "/tmp/blinkit_scraped.json"
    with open(backup_path, "w") as f:
        json.dump(all_products, f, indent=2)
    print(f"  Backup saved: {backup_path}")

    # Save to DB
    print("\n  Saving to database…")
    await save_to_db(all_products, cat_queries)

    print("\n  ✅ All done!")


if __name__ == "__main__":
    asyncio.run(main())
