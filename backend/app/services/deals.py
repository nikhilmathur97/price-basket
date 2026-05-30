"""
Deals service
=============
Finds the biggest cross-platform savings right now. Shared by the content
engine (daily deal articles) and the social poster (daily deal posts) so both
surface the same high-value products.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Product


@dataclass
class Deal:
    product_id: str
    slug: str
    name: str
    brand: Optional[str]
    image_url: Optional[str]
    category: Optional[str]
    unit: Optional[str]
    best_price: float
    highest_price: float
    savings_amount: float
    savings_percent: int
    cheapest_platform: Optional[str]
    platform_count: int

    def to_dict(self) -> dict:
        return asdict(self)


async def get_top_deals(limit: int = 15, min_savings_percent: int = 8) -> List[Deal]:
    """Return active products ranked by cross-platform savings %, biggest first.

    A "deal" is a product available on 2+ platforms where the cheapest price is
    at least `min_savings_percent` below the most expensive — i.e. real money
    saved by buying on the right platform.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Product)
            .where(Product.is_active == True)  # noqa: E712
            .options(
                selectinload(Product.category),
                selectinload(Product.platform_prices).selectinload(
                    PlatformPrice.platform
                ),
            )
        )
        products = result.scalars().all()

    deals: List[Deal] = []
    for p in products:
        avail = [
            pp
            for pp in (p.platform_prices or [])
            if pp.is_available and pp.price and float(pp.price) > 0
        ]
        if len(avail) < 2:
            continue

        prices = [float(pp.price) for pp in avail]
        best = min(prices)
        highest = max(prices)
        if highest <= best:
            continue

        savings = round(highest - best, 2)
        savings_pct = int(round((savings / highest) * 100))
        if savings_pct < min_savings_percent:
            continue

        cheapest_pp = min(avail, key=lambda pp: float(pp.price))
        deals.append(
            Deal(
                product_id=str(p.id),
                slug=p.slug,
                name=p.name,
                brand=p.brand,
                image_url=p.image_url,
                category=p.category.name if p.category else None,
                unit=p.unit,
                best_price=best,
                highest_price=highest,
                savings_amount=savings,
                savings_percent=savings_pct,
                cheapest_platform=cheapest_pp.platform.name
                if cheapest_pp.platform
                else None,
                platform_count=len(avail),
            )
        )

    deals.sort(key=lambda d: d.savings_percent, reverse=True)
    return deals[:limit]
