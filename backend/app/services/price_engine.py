"""
Real-Time Price Engine
======================
Orchestrates price fetching from all platforms for a given product:
1. Check Redis cache (sub-second response).
2. On cache miss → fan-out to all enabled scrapers/APIs concurrently.
3. Persist results to PostgreSQL + re-warm cache.
4. Compute derived fields: cheapest, fastest, best_value.
"""
import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import List, Optional

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.redis_client import cache_get, cache_set, cache_delete_pattern
from app.config import settings
from app.models.platform import Platform
from app.models.price import PlatformPrice, PriceHistory
from app.models.product import Product

log = structlog.get_logger(__name__)

PRICE_CACHE_PREFIX = "price:"
PRICE_CACHE_TTL = settings.REDIS_PRICE_TTL


@dataclass
class PriceData:
    platform_id: str
    platform_slug: str
    price: float
    original_price: Optional[float] = None
    discount_percent: float = 0.0
    discount_label: Optional[str] = None
    is_available: bool = True
    delivery_time_minutes: Optional[int] = None
    platform_product_id: Optional[str] = None
    platform_product_url: Optional[str] = None
    platform_image_url: Optional[str] = None
    source: str = "scrape"


@dataclass
class PriceBundle:
    """Enriched price result for a product across platforms."""
    product_id: str
    prices: List[PriceData] = field(default_factory=list)
    cheapest_platform_id: Optional[str] = None
    fastest_platform_id: Optional[str] = None
    best_value_platform_id: Optional[str] = None  # weighted score: 70% price + 30% speed
    fetched_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def compute_highlights(self) -> None:
        available = [p for p in self.prices if p.is_available]
        if not available:
            return

        self.cheapest_platform_id = min(available, key=lambda p: p.price).platform_id

        with_delivery = [p for p in available if p.delivery_time_minutes is not None]
        if with_delivery:
            self.fastest_platform_id = min(with_delivery, key=lambda p: p.delivery_time_minutes).platform_id

        if with_delivery:
            min_price = min(p.price for p in available)
            max_price = max(p.price for p in available) or 1
            min_time = min(p.delivery_time_minutes for p in with_delivery)
            max_time = max(p.delivery_time_minutes for p in with_delivery) or 1

            def score(p: PriceData) -> float:
                norm_price = (p.price - min_price) / (max_price - min_price + 1e-9)
                t = p.delivery_time_minutes or max_time
                norm_time = (t - min_time) / (max_time - min_time + 1e-9)
                return 0.7 * norm_price + 0.3 * norm_time  # lower is better

            self.best_value_platform_id = min(with_delivery, key=score).platform_id


class PriceEngine:
    """Core price orchestration service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_prices(self, product_id: uuid.UUID) -> Optional[PriceBundle]:
        """Return prices for a product, from cache or fresh fetch."""
        cache_key = f"{PRICE_CACHE_PREFIX}{product_id}"
        cached = await cache_get(cache_key)
        if cached:
            return PriceBundle(**json.loads(cached))

        bundle = await self._fetch_and_persist(product_id)
        if bundle:
            await cache_set(cache_key, json.dumps(bundle.__dict__), PRICE_CACHE_TTL)
        return bundle

    async def force_refresh(self, product_id: uuid.UUID) -> Optional[PriceBundle]:
        """Bypass cache — fetch fresh prices immediately."""
        cache_key = f"{PRICE_CACHE_PREFIX}{product_id}"
        await cache_delete_pattern(cache_key)
        return await self._fetch_and_persist(product_id)

    async def get_prices_bulk(self, product_ids: List[uuid.UUID]) -> dict[str, PriceBundle]:
        """Fan-out price fetches for multiple products concurrently."""
        tasks = [self.get_prices(pid) for pid in product_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return {
            str(pid): res
            for pid, res in zip(product_ids, results)
            if isinstance(res, PriceBundle)
        }

    # ── Internal ──────────────────────────────────────────────────────────────

    async def _fetch_and_persist(self, product_id: uuid.UUID) -> Optional[PriceBundle]:
        # Load platforms
        result = await self.db.execute(
            select(Platform).where(Platform.is_active == True, Platform.scraping_enabled == True)  # noqa: E712
        )
        platforms = result.scalars().all()
        if not platforms:
            return None

        # Fan-out scrape tasks
        from app.scrapers import get_scraper  # lazy import to avoid circular
        scrape_tasks = [
            self._safe_scrape(get_scraper(p.slug), p, product_id)
            for p in platforms
        ]
        price_results: List[Optional[PriceData]] = await asyncio.gather(*scrape_tasks)

        bundle = PriceBundle(product_id=str(product_id))
        bundle.prices = [r for r in price_results if r is not None]
        bundle.compute_highlights()

        # Persist to DB asynchronously (fire and forget via task)
        asyncio.create_task(self._persist_prices(product_id, bundle))

        return bundle

    async def _safe_scrape(self, scraper, platform: Platform, product_id: uuid.UUID) -> Optional[PriceData]:
        try:
            # Look up the product name so scrapers that query by name (e.g. Apify) can use it.
            product = await self.db.get(Product, product_id)
            product_name: str = product.name if product else ""
            data = await scraper.fetch_price(product_id, product_name=product_name)
            if data:
                data.platform_id = str(platform.id)
                data.platform_slug = platform.slug
            return data
        except Exception as exc:
            log.warning("scrape_failed", platform=platform.slug, error=str(exc))
            await self._record_failure(platform)
            return None

    async def _persist_prices(self, product_id: uuid.UUID, bundle: PriceBundle) -> None:
        """Upsert PlatformPrice rows and append to PriceHistory."""
        now = datetime.now(UTC)
        try:
            for price_data in bundle.prices:
                pid = uuid.UUID(price_data.platform_id)
                result = await self.db.execute(
                    select(PlatformPrice).where(
                        PlatformPrice.product_id == product_id,
                        PlatformPrice.platform_id == pid,
                    )
                )
                existing = result.scalar_one_or_none()
                if existing:
                    existing.price = price_data.price
                    existing.original_price = price_data.original_price
                    existing.discount_percent = price_data.discount_percent
                    existing.discount_label = price_data.discount_label
                    existing.is_available = price_data.is_available
                    existing.delivery_time_minutes = price_data.delivery_time_minutes
                    existing.platform_product_id = price_data.platform_product_id
                    existing.platform_product_url = price_data.platform_product_url
                    existing.last_updated = now
                    existing.source = price_data.source
                else:
                    new_pp = PlatformPrice(
                        product_id=product_id,
                        platform_id=pid,
                        price=price_data.price,
                        original_price=price_data.original_price,
                        discount_percent=price_data.discount_percent,
                        discount_label=price_data.discount_label,
                        is_available=price_data.is_available,
                        delivery_time_minutes=price_data.delivery_time_minutes,
                        platform_product_id=price_data.platform_product_id,
                        platform_product_url=price_data.platform_product_url,
                        last_updated=now,
                        source=price_data.source,
                    )
                    self.db.add(new_pp)

                # Append history row
                self.db.add(
                    PriceHistory(
                        product_id=product_id,
                        platform_id=pid,
                        price=price_data.price,
                        is_available=price_data.is_available,
                        recorded_at=now,
                    )
                )

            await self.db.commit()
        except Exception as exc:
            log.error("price_persist_failed", product_id=str(product_id), error=str(exc))
            await self.db.rollback()

    async def _record_failure(self, platform: Platform) -> None:
        try:
            await self.db.execute(
                update(Platform)
                .where(Platform.id == platform.id)
                .values(scrape_failure_count=Platform.scrape_failure_count + 1)
            )
            await self.db.commit()
        except Exception:
            pass
