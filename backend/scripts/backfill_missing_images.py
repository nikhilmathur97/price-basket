"""
One-off backfill: force an immediate re-scrape for every active product that
currently has no image anywhere (Product.image_url, Product.thumbnail_url,
and every PlatformPrice.platform_image_url all null).

Why this is needed: refresh_all_prices (price_update_worker.py) only re-queues
products whose price data is stale (>PRICE_STALE_THRESHOLD) or missing
entirely, so a product with a recent-but-imageless price row won't get
picked up again until it goes stale on its own. This script bypasses that
wait and enqueues those products' refresh_product_price task immediately.
Frontend already falls back to platform_prices[].platform_image_url when
Product.image_url/thumbnail_url are null (see ProductCard/index.tsx), so a
successful re-scrape is enough to fix display — no Product row edit needed.

Run from the backend directory (inside the api/worker container):
    python -m scripts.backfill_missing_images
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
from app.models.price import PlatformPrice


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        has_platform_image = (
            select(PlatformPrice.product_id)
            .where(PlatformPrice.platform_image_url.isnot(None))
            .distinct()
            .scalar_subquery()
        )
        result = await db.execute(
            select(Product.id).where(
                Product.is_active == True,  # noqa: E712
                Product.image_url.is_(None),
                Product.thumbnail_url.is_(None),
                ~Product.id.in_(has_platform_image),
            )
        )
        product_ids = [row[0] for row in result]

    print(f"found {len(product_ids)} active products with no image anywhere", flush=True)

    from app.workers.price_update_worker import refresh_product_price
    for pid in product_ids:
        refresh_product_price.apply_async(args=[str(pid)], queue="prices")

    print(f"enqueued {len(product_ids)} immediate refresh tasks", flush=True)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
