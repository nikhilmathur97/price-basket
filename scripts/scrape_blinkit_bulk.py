"""
scripts/scrape_blinkit_bulk.py
==============================
Bulk-scrape Blinkit products across all grocery categories, then upsert them
into the PriceBasket database (products + platform_prices for Blinkit).

Usage:
    cd /path/to/price-basket
    python scripts/scrape_blinkit_bulk.py

Env vars used (same as backend .env):
    BLINKIT_LAT   (default 28.4511202  — Gurugram)
    BLINKIT_LON   (default 77.0965147)
    DATABASE_URL
"""

import asyncio
import os
import sys
import re
import uuid
import time
import json
from typing import Optional
from urllib.parse import quote_plus

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.product import Category, Product
from app.models.platform import Platform
from app.models.price import PlatformPrice

# ── Config ──────────────────────────────────────────────────────────────────
LAT = getattr(settings, "BLINKIT_LAT", "28.4511202")
LON = getattr(settings, "BLINKIT_LON", "77.0965147")
BLINKIT_BASE = "https://blinkit.com"
SEARCH_V6 = "https://blinkit.com/v6/listing/products"

# Delivery time Blinkit promises
BLINKIT_DELIVERY_MINS = 10

# Categories → search queries.
# Each tuple: (category_slug, query_list)
CATEGORY_QUERIES = [
    ("fruits-vegetables", [
        "fresh onion", "tomato", "banana", "spinach palak", "apple",
        "potato aloo", "lemon nimbu", "capsicum", "carrot", "cucumber",
        "garlic lehsun", "ginger adrak", "green chilli", "coriander dhania",
        "pineapple", "watermelon", "mango", "grapes", "pomegranate",
    ]),
    ("dairy-breakfast", [
        "amul milk", "amul butter", "mother dairy curd dahi", "farm fresh eggs",
        "amul paneer", "amul cheese", "epigamia greek yogurt",
        "nestle munch", "britannia cheese", "go cheese slice",
    ]),
    ("snacks-drinks", [
        "lays magic masala chips", "coca cola cold drink", "kurkure masala",
        "red bull energy drink", "haldirams aloo bhujia", "tropicana orange juice",
        "mango slice juice", "pepsi", "7up", "sprite",
        "parle g biscuit", "hide and seek biscuit", "good day biscuit",
        "doritos", "pringles", "uncle chips",
    ]),
    ("bakery", [
        "britannia 5050 biscuit", "harvest gold bread", "oreo cream biscuit",
        "mcvities digestive", "bread white loaf", "pav bun",
        "croissant", "cake", "muffin", "rusk toast",
    ]),
    ("staples", [
        "aashirvaad whole wheat atta", "india gate basmati rice",
        "tata sampann toor dal", "fortune sunflower oil",
        "mdh chole masala", "chana dal", "urad dal", "moong dal",
        "poha", "suji rava", "besan chickpea flour",
    ]),
    ("oils-spices", [
        "fortune sunflower oil", "saffola gold oil", "olive oil",
        "everest red chilli powder", "mdh kitchen king masala",
        "turmeric powder haldi", "cumin jeera seeds",
        "coriander powder dhania", "garam masala", "salt namak",
    ]),
    ("household", [
        "vim dishwash bar", "surf excel easy wash", "harpic power plus",
        "lizol floor cleaner", "dettol antiseptic liquid",
        "colgate max fresh toothpaste", "ariel detergent powder",
        "scotch brite scrub pad", "pril dishwash liquid",
        "phenyl floor cleaner",
    ]),
    ("personal-care", [
        "dove moisturising soap", "head shoulders anti dandruff shampoo",
        "colgate maxfresh toothpaste", "nivea body lotion",
        "dettol soap antibacterial", "gillette mach3 razor",
        "ponds face cream", "vaseline petroleum jelly",
        "himalaya face wash neem", "pantene shampoo",
    ]),
    ("chicken-meat", [
        "licious fresh chicken breast boneless", "licious chicken curry cut",
        "country delight brown eggs", "raw chicken leg piece",
        "licious mutton keema", "chicken wings",
    ]),
    ("frozen-foods", [
        "mccain french fries frozen", "sumeru frozen peas",
        "mother dairy frozen mix veg", "frozen corn",
        "igloo ice cream", "kwality walls cornetto",
    ]),
    ("baby-care", [
        "pampers diapers", "huggies diapers", "johnsons baby shampoo",
        "cerelac baby food", "nestum baby cereal",
    ]),
]

# ── HTTP helpers ────────────────────────────────────────────────────────────

def build_headers(query: str) -> dict:
    return {
        "app_client":        "consumer_web",
        "lat":               str(LAT),
        "lon":               str(LON),
        "rn_bundle_version": "1000033",
        "Accept":            "application/json, text/plain, */*",
        "Accept-Language":   "en-IN,en;q=0.9",
        "Origin":            BLINKIT_BASE,
        "Referer":           f"{BLINKIT_BASE}/search?q={quote_plus(query)}",
        "web-version":       "2024120401",
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    }


def build_image_url(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    name = raw.lstrip("/")
    if name.startswith("rsku_image/products_main/"):
        return f"https://cdn.blinkit.com/{name}"
    return f"https://cdn.blinkit.com/rsku_image/products_main/{name}"


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:200]


async def search_blinkit(client: httpx.AsyncClient, query: str) -> list[dict]:
    """Search Blinkit v6 API and extract product dicts."""
    try:
        resp = await client.get(
            SEARCH_V6,
            params={"q": query, "start": 0, "limit": 20, "search_type": 8},
            headers=build_headers(query),
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"    ⚠  HTTP error for '{query}': {e}")
        return []

    products = []
    objects = data.get("objects") or []
    for obj in objects:
        if isinstance(obj, dict) and obj.get("type") == "PRODUCT" and "data" in obj:
            products.append(obj["data"])

    if not products and isinstance(data, list):
        products = data

    if not products:
        products = data.get("products") or data.get("results") or []

    return products


def parse_product(raw: dict, category_slug: str) -> Optional[dict]:
    """Convert raw Blinkit API dict → normalised product dict."""
    price = float(raw.get("price") or 0)
    mrp = float(raw.get("mrp") or price)
    if price <= 0 and mrp <= 0:
        return None
    if price <= 0:
        price = mrp

    in_stock = bool(
        raw.get("in_stock") or raw.get("available") or raw.get("is_in_stock")
    )

    # Image
    raw_imgs = raw.get("images") or []
    if raw_imgs:
        first = raw_imgs[0]
        raw_img = (
            first.get("name") or first.get("url")
            or (first if isinstance(first, str) else None)
        )
    else:
        raw_img = raw.get("image_url") or raw.get("thumbnail")
    image_url = build_image_url(raw_img)

    name = (raw.get("name") or raw.get("product_name") or "").strip()
    brand = (raw.get("brand") or raw.get("brand_name") or "").strip()
    unit = (
        raw.get("unit") or raw.get("quantity") or raw.get("variant_name") or ""
    ).strip()
    pid = str(raw.get("id") or raw.get("product_id") or raw.get("variant_id") or "")
    slug_raw = raw.get("slug") or pid or name
    slug = slugify(slug_raw)

    if not name or not slug:
        return None

    discount = round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0

    product_url = (
        f"{BLINKIT_BASE}/prn/{raw.get('slug') or pid}" if (raw.get("slug") or pid) else None
    )

    return {
        "blinkit_pid": pid,
        "name": name,
        "brand": brand or None,
        "unit": unit or None,
        "slug": slug,
        "category_slug": category_slug,
        "image_url": image_url,
        "price": price,
        "mrp": mrp,
        "discount_percent": discount,
        "is_available": in_stock,
        "product_url": product_url,
        "tags": [t.lower() for t in [name, brand, category_slug] if t],
    }


# ── Database helpers ─────────────────────────────────────────────────────────

async def get_or_create_product(
    db: AsyncSession,
    item: dict,
    cat_map: dict[str, uuid.UUID],
) -> Product:
    """Upsert product by slug; return the Product ORM object."""
    result = await db.execute(select(Product).where(Product.slug == item["slug"]))
    product = result.scalar_one_or_none()

    cat_id = cat_map.get(item["category_slug"])

    if product is None:
        product = Product(
            slug=item["slug"],
            name=item["name"],
            brand=item["brand"],
            unit=item["unit"],
            description=f"{item['name']} — {item['unit'] or ''}. From Blinkit.",
            category_id=cat_id,
            image_url=item["image_url"],
            thumbnail_url=item["image_url"],
            tags=item["tags"],
            is_featured=True,
            is_active=True,
        )
        db.add(product)
        await db.flush()
    else:
        # Update image / name if we got better data
        if item["image_url"]:
            product.image_url = item["image_url"]
            product.thumbnail_url = item["image_url"]
        if item["name"]:
            product.name = item["name"]
        if item["brand"]:
            product.brand = item["brand"]
        if cat_id and not product.category_id:
            product.category_id = cat_id
        product.is_active = True
        product.is_featured = True
        await db.flush()

    return product


async def upsert_platform_price(
    db: AsyncSession,
    product: Product,
    platform_id: uuid.UUID,
    item: dict,
) -> None:
    """Insert or update the PlatformPrice row for Blinkit."""
    result = await db.execute(
        select(PlatformPrice).where(
            PlatformPrice.product_id == product.id,
            PlatformPrice.platform_id == platform_id,
        )
    )
    pp = result.scalar_one_or_none()

    discount_label = f"{int(item['discount_percent'])}% OFF" if item["discount_percent"] > 0 else None

    if pp is None:
        pp = PlatformPrice(
            product_id=product.id,
            platform_id=platform_id,
            price=item["price"],
            original_price=item["mrp"] if item["mrp"] > item["price"] else None,
            discount_percent=item["discount_percent"],
            discount_label=discount_label,
            is_available=item["is_available"],
            delivery_time_minutes=BLINKIT_DELIVERY_MINS,
            platform_product_id=item["blinkit_pid"] or None,
            platform_product_url=item["product_url"],
            platform_image_url=item["image_url"],
            source="scrape",
        )
        db.add(pp)
    else:
        pp.price = item["price"]
        pp.original_price = item["mrp"] if item["mrp"] > item["price"] else None
        pp.discount_percent = item["discount_percent"]
        pp.discount_label = discount_label
        pp.is_available = item["is_available"]
        pp.delivery_time_minutes = BLINKIT_DELIVERY_MINS
        if item["image_url"]:
            pp.platform_image_url = item["image_url"]
        if item["product_url"]:
            pp.platform_product_url = item["product_url"]
        if item["blinkit_pid"]:
            pp.platform_product_id = item["blinkit_pid"]
        pp.source = "scrape"

    await db.flush()


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    print("\n🟡  Blinkit Bulk Scraper — PriceBasket")
    print("=" * 50)
    print(f"   Location : lat={LAT}, lon={LON}")
    print(f"   Categories: {len(CATEGORY_QUERIES)}")
    print()

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # Get Blinkit platform
        result = await db.execute(select(Platform).where(Platform.slug == "blinkit"))
        platform = result.scalar_one_or_none()
        if not platform:
            print("❌  Blinkit platform not found in DB. Run seed_data.py first.")
            return

        # Build category slug → id map
        result = await db.execute(select(Category))
        cat_map = {c.slug: c.id for c in result.scalars().all()}
        if not cat_map:
            print("❌  No categories found. Run seed_data.py first.")
            return

        print(f"   Platform  : {platform.name} (id={platform.id})")
        print(f"   Categories in DB: {list(cat_map.keys())}\n")

        async with httpx.AsyncClient(follow_redirects=True) as client:
            total_scraped = 0
            total_saved = 0
            seen_slugs: set[str] = set()

            for cat_slug, queries in CATEGORY_QUERIES:
                cat_total = 0
                print(f"📦  [{cat_slug}]")

                for query in queries:
                    await asyncio.sleep(0.4)  # polite rate-limit
                    raw_products = await search_blinkit(client, query)

                    for raw in raw_products:
                        item = parse_product(raw, cat_slug)
                        if not item:
                            continue

                        # Deduplicate within this run
                        if item["slug"] in seen_slugs:
                            continue
                        seen_slugs.add(item["slug"])

                        total_scraped += 1
                        try:
                            product = await get_or_create_product(db, item, cat_map)
                            await upsert_platform_price(db, product, platform.id, item)
                            cat_total += 1
                            total_saved += 1
                        except Exception as e:
                            print(f"    ⚠  DB error for '{item['name']}': {e}")
                            await db.rollback()

                    print(f"   '{query}' → {len(raw_products)} raw items", end="\r")

                await db.commit()
                print(f"   ✅  {cat_slug}: {cat_total} products saved          ")

        await db.commit()
        print(f"\n✅  Done! Scraped {total_scraped} unique products, saved {total_saved} to DB.")
        print(f"   All products marked is_featured=True for home page display.\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
