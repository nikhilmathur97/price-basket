"""
One-off backfill: re-normalize existing Product.unit values that were stored
as raw platform enum strings (e.g. "46 MILLILITRE", "2 KILOGRAM") before
normalize_unit() existed. save_products_to_db() only ever sets `unit` once
(sticky-if-empty), so already-scraped rows never picked up the fix on their
own — this rewrites them in place.

Run from the backend directory:
    python -m scripts.backfill_normalize_units
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.product import Product
from app.scrapers.bulk_product_scraper import extract_weight_grams, normalize_unit


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    updated = 0
    async with Session() as db:
        result = await db.execute(select(Product).where(Product.unit.isnot(None)))
        products = result.scalars().all()
        for p in products:
            new_unit = normalize_unit(p.unit)
            new_weight = extract_weight_grams(new_unit)
            if new_unit != p.unit or new_weight != p.weight_grams:
                p.unit = new_unit
                p.weight_grams = new_weight
                updated += 1
        await db.commit()

    print(f"checked {len(products)} products, normalized {updated}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
