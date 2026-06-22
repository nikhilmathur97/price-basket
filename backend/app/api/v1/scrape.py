"""
Scrape API — admin-only endpoints to trigger live scraping and seed data.

POST /scrape/bulk          — scrape a list of product queries across all platforms
POST /scrape/seed-from-json — seed DB from the scraped_prices.json file
GET  /scrape/status        — get scraping status / last run info
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Category, Product
from app.models.user import User

log = structlog.get_logger(__name__)
router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:100]


# ── Schemas ───────────────────────────────────────────────────────────────────

class BulkScrapeRequest(BaseModel):
    queries: List[str]
    platforms: Optional[List[str]] = None  # None = all active platforms
    save_to_db: bool = True


class ScrapeResultItem(BaseModel):
    platform: str
    name: str
    price: float
    mrp: float
    image_url: Optional[str] = None
    unit: Optional[str] = None
    in_stock: bool = True
    query: str
    pid: Optional[str] = None
    url: Optional[str] = None
    source: str = "scrape"


class SeedFromJsonRequest(BaseModel):
    file_path: Optional[str] = None  # defaults to backend/app/data/scraped_prices.json
    dry_run: bool = False
    limit: Optional[int] = None  # limit number of items to process


# ── Category mapping for scraped data ─────────────────────────────────────────
_QUERY_CATEGORY_MAP = {
    # Dairy
    "milk": "dairy-breakfast",
    "butter": "dairy-breakfast",
    "paneer": "dairy-breakfast",
    "curd": "dairy-breakfast",
    "yogurt": "dairy-breakfast",
    "eggs": "dairy-breakfast",
    "cheese": "dairy-breakfast",
    "ghee": "dairy-breakfast",
    "cream": "dairy-breakfast",
    "horlicks": "dairy-breakfast",
    "boost": "dairy-breakfast",
    "nescafe": "dairy-breakfast",
    "coffee": "dairy-breakfast",
    "tea": "dairy-breakfast",
    "oats": "dairy-breakfast",
    "cornflakes": "dairy-breakfast",
    "honey": "dairy-breakfast",
    "jam": "dairy-breakfast",
    "poha": "dairy-breakfast",
    # Fruits & Vegetables
    "onion": "fruits-vegetables",
    "tomato": "fruits-vegetables",
    "banana": "fruits-vegetables",
    "spinach": "fruits-vegetables",
    "apple": "fruits-vegetables",
    "potato": "fruits-vegetables",
    "lemon": "fruits-vegetables",
    "capsicum": "fruits-vegetables",
    "carrot": "fruits-vegetables",
    "cucumber": "fruits-vegetables",
    "cauliflower": "fruits-vegetables",
    "broccoli": "fruits-vegetables",
    "mango": "fruits-vegetables",
    "watermelon": "fruits-vegetables",
    "grapes": "fruits-vegetables",
    "orange": "fruits-vegetables",
    "vegetable": "fruits-vegetables",
    "fruit": "fruits-vegetables",
    # Snacks & Drinks
    "lays": "snacks-drinks",
    "kurkure": "snacks-drinks",
    "haldiram": "snacks-drinks",
    "maggi": "snacks-drinks",
    "noodles": "snacks-drinks",
    "cola": "snacks-drinks",
    "sprite": "snacks-drinks",
    "pepsi": "snacks-drinks",
    "juice": "snacks-drinks",
    "redbull": "snacks-drinks",
    "cadbury": "snacks-drinks",
    "chocolate": "snacks-drinks",
    "oreo": "snacks-drinks",
    "biscuit": "snacks-drinks",
    "parle": "snacks-drinks",
    "britannia": "snacks-drinks",
    "chips": "snacks-drinks",
    "snack": "snacks-drinks",
    "drink": "snacks-drinks",
    "water": "snacks-drinks",
    # Staples
    "atta": "staples",
    "flour": "staples",
    "rice": "staples",
    "dal": "staples",
    "salt": "staples",
    "sugar": "staples",
    "ketchup": "staples",
    "maida": "staples",
    "suji": "staples",
    "besan": "staples",
    # Oils & Spices
    "oil": "oils-spices",
    "ghee": "oils-spices",
    "turmeric": "oils-spices",
    "chilli": "oils-spices",
    "masala": "oils-spices",
    "pepper": "oils-spices",
    "cumin": "oils-spices",
    "coriander": "oils-spices",
    "spice": "oils-spices",
    # Household
    "surf": "household",
    "ariel": "household",
    "detergent": "household",
    "harpic": "household",
    "lizol": "household",
    "vim": "household",
    "dettol": "household",
    "colin": "household",
    "domex": "household",
    "pril": "household",
    "scotch": "household",
    "cleaner": "household",
    # Personal Care
    "colgate": "personal-care",
    "toothpaste": "personal-care",
    "dove": "personal-care",
    "soap": "personal-care",
    "shampoo": "personal-care",
    "pantene": "personal-care",
    "vaseline": "personal-care",
    "nivea": "personal-care",
    "gillette": "personal-care",
    "whisper": "personal-care",
    "himalaya": "personal-care",
    "biotique": "personal-care",
    "lotion": "personal-care",
    "face wash": "personal-care",
    # Baby Care
    "pampers": "baby-care",
    "huggies": "baby-care",
    "johnson": "baby-care",
    "cerelac": "baby-care",
    "nestum": "baby-care",
    "baby": "baby-care",
    # Chicken & Meat
    "chicken": "chicken-meat",
    "licious": "chicken-meat",
    "mutton": "chicken-meat",
    "fish": "chicken-meat",
    "prawn": "chicken-meat",
}


def _guess_category(name: str, query: str) -> str:
    """Guess category slug from product name or query."""
    text_lower = (name + " " + query).lower()
    for keyword, cat in _QUERY_CATEGORY_MAP.items():
        if keyword in text_lower:
            return cat
    return "snacks-drinks"  # default


# ── Background task: scrape and save ─────────────────────────────────────────

async def _scrape_and_save_bg(
    queries: List[str],
    platform_slugs: List[str],
    db_url: str,
) -> None:
    """Background task: scrape queries across platforms and save to DB."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.scrapers import get_scraper

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    all_results = []
    now = datetime.now(timezone.utc)

    for platform_slug in platform_slugs:
        scraper = get_scraper(platform_slug)
        if not scraper:
            log.warning("scraper_not_found", platform=platform_slug)
            continue

        for query in queries:
            try:
                fake_id = uuid.uuid4()
                price_data = await scraper.fetch_price(fake_id, product_name=query)
                if price_data and price_data.price > 0:
                    all_results.append({
                        "platform": platform_slug,
                        "name": query,
                        "price": price_data.price,
                        "mrp": price_data.original_price or price_data.price,
                        "image_url": price_data.platform_image_url or "",
                        "unit": "",
                        "in_stock": price_data.is_available,
                        "query": query,
                        "pid": price_data.platform_product_id or "",
                        "url": price_data.platform_product_url or "",
                        "source": price_data.source,
                    })
                await asyncio.sleep(1.0)
            except Exception as exc:
                log.warning("scrape_query_failed", platform=platform_slug, query=query, error=str(exc))

    if all_results:
        await _save_results_to_db(all_results, AsyncSessionLocal)

    await engine.dispose()
    log.info("bulk_scrape_complete", total=len(all_results))


async def _save_results_to_db(items: list[dict], AsyncSessionLocal) -> dict:
    """Save scraped items to the database."""
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    saved = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        # Load all platforms and categories into memory
        plat_result = await db.execute(select(Platform).where(Platform.is_active == True))  # noqa
        platforms = {p.slug: p for p in plat_result.scalars().all()}

        cat_result = await db.execute(select(Category).where(Category.is_active == True))  # noqa
        categories = {c.slug: c for c in cat_result.scalars().all()}

        for item in items:
            platform_slug = item.get("platform", "")
            platform = platforms.get(platform_slug)
            if not platform:
                skipped += 1
                continue

            name = (item.get("name") or "").strip()[:200]
            price = item.get("price")
            if not name or not price or float(price) <= 0:
                skipped += 1
                continue

            cat_slug = _guess_category(name, item.get("query", ""))
            category = categories.get(cat_slug) or categories.get("snacks-drinks")

            # Upsert product
            prod_slug = _slugify(name)
            res = await db.execute(select(Product).where(Product.slug == prod_slug))
            product = res.scalar_one_or_none()

            if not product:
                product = Product(
                    id=uuid.uuid4(),
                    name=name,
                    slug=prod_slug,
                    category_id=category.id if category else None,
                    image_url=item.get("image_url") or None,
                    thumbnail_url=item.get("image_url") or None,
                    unit=item.get("unit") or None,
                    is_active=True,
                    is_featured=True,
                )
                db.add(product)
                await db.flush()
            else:
                # Update image if we now have one
                if not product.image_url and item.get("image_url"):
                    product.image_url = item["image_url"]
                    product.thumbnail_url = item["image_url"]
                if not product.unit and item.get("unit"):
                    product.unit = item["unit"]

            # Upsert platform price
            price_val = float(price)
            mrp_val = float(item.get("mrp") or price)
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
            saved += 1

            if saved % 50 == 0:
                await db.commit()
                log.info("scrape_save_progress", saved=saved)

        await db.commit()

    return {"saved": saved, "skipped": skipped}


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.post("/bulk")
async def bulk_scrape(
    body: BulkScrapeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a bulk scrape of product queries across platforms.
    Admin only. Runs in background — returns immediately.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    if not body.queries:
        raise HTTPException(status_code=400, detail="No queries provided")

    # Get active platforms
    if body.platforms:
        platform_slugs = body.platforms
    else:
        result = await db.execute(
            select(Platform.slug)
            .where(Platform.is_active == True, Platform.scraping_enabled == True)  # noqa
        )
        platform_slugs = [row[0] for row in result.all()]

    if not platform_slugs:
        raise HTTPException(status_code=400, detail="No active platforms found")

    from app.config import settings
    db_url = settings.DATABASE_URL

    if body.save_to_db:
        background_tasks.add_task(
            _scrape_and_save_bg,
            body.queries[:50],  # cap at 50 queries per request
            platform_slugs,
            db_url,
        )

    return {
        "status": "started",
        "queries": len(body.queries[:50]),
        "platforms": platform_slugs,
        "message": f"Scraping {len(body.queries[:50])} queries across {len(platform_slugs)} platforms in background",
    }


@router.post("/seed-from-json")
async def seed_from_json(
    body: SeedFromJsonRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Seed the database from the scraped_prices.json file.
    Admin only.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    # Determine file path
    file_path = body.file_path
    if not file_path:
        file_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "data", "scraped_prices.json"
        )
        file_path = os.path.abspath(file_path)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    try:
        with open(file_path) as f:
            items = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse JSON: {e}")

    if body.limit:
        items = items[:body.limit]

    if body.dry_run:
        by_platform: dict = {}
        for item in items:
            p = item.get("platform", "unknown")
            by_platform[p] = by_platform.get(p, 0) + 1
        return {
            "dry_run": True,
            "total_items": len(items),
            "by_platform": by_platform,
        }

    # Run in background
    from app.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession as AS
    from sqlalchemy.orm import sessionmaker

    async def _seed_bg():
        engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
        AsyncSessionLocal = sessionmaker(engine, class_=AS, expire_on_commit=False)
        try:
            result = await _save_results_to_db(items, AsyncSessionLocal)
            log.info("seed_from_json_complete", **result)
        finally:
            await engine.dispose()

    background_tasks.add_task(_seed_bg)

    return {
        "status": "started",
        "total_items": len(items),
        "message": f"Seeding {len(items)} items from {os.path.basename(file_path)} in background",
    }


@router.get("/status")
async def scrape_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get scraping status — product counts, last update times, platform coverage."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    # Product count
    product_count = (await db.execute(
        text("SELECT COUNT(*) FROM products WHERE is_active = true")
    )).scalar_one()

    # Featured product count
    featured_count = (await db.execute(
        text("SELECT COUNT(*) FROM products WHERE is_active = true AND is_featured = true")
    )).scalar_one()

    # Price count per platform
    platform_stats = (await db.execute(
        text("""
            SELECT pl.slug, pl.name, COUNT(pp.id) as price_count,
                   MAX(pp.last_updated) as last_updated,
                   COUNT(CASE WHEN pp.is_available THEN 1 END) as available_count
            FROM platforms pl
            LEFT JOIN platform_prices pp ON pp.platform_id = pl.id
            WHERE pl.is_active = true
            GROUP BY pl.slug, pl.name
            ORDER BY price_count DESC
        """)
    )).fetchall()

    # Category coverage
    category_stats = (await db.execute(
        text("""
            SELECT c.slug, c.name, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
            WHERE c.is_active = true
            GROUP BY c.slug, c.name
            ORDER BY product_count DESC
        """)
    )).fetchall()

    # Last price update
    last_update = (await db.execute(
        text("SELECT MAX(last_updated) FROM platform_prices")
    )).scalar_one()

    return {
        "product_count": product_count,
        "featured_count": featured_count,
        "last_price_update": last_update.isoformat() if last_update else None,
        "platforms": [
            {
                "slug": row[0],
                "name": row[1],
                "price_count": row[2],
                "last_updated": row[3].isoformat() if row[3] else None,
                "available_count": row[4],
            }
            for row in platform_stats
        ],
        "categories": [
            {"slug": row[0], "name": row[1], "product_count": row[2]}
            for row in category_stats
        ],
    }
