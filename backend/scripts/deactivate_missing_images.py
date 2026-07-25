"""
One-off cleanup: deactivate every active product that still has no image
anywhere (Product.image_url, Product.thumbnail_url, and every
PlatformPrice.platform_image_url all null) after the backfill_missing_images
re-scrape has had time to run. Reversible — sets is_active=False rather than
deleting rows, so a product can be re-activated later if a future scrape
picks up an image for it.

Run from the backend directory (inside the api/worker container):
    python -m scripts.deactivate_missing_images
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select, update
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

        print(f"found {len(product_ids)} active products still with no image anywhere", flush=True)

        if product_ids:
            await db.execute(
                update(Product).where(Product.id.in_(product_ids)).values(is_active=False)
            )
            await db.commit()

        print(f"deactivated {len(product_ids)} products", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
