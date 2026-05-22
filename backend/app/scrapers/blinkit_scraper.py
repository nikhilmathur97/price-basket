"""
Blinkit scraper — powered by the Apify actor
``jocular_quisling/blinkit-product-scraper``.

Flow
----
1. ``fetch_price(product_id, product_name)`` is called by the PriceEngine.
2. We run the Apify actor synchronously inside a thread-pool executor so we
   don't block the async event loop.
3. The actor returns a list of matching products from Blinkit; we pick the
   best-ranked result whose name is closest to ``product_name``.
4. The result is mapped to a ``PriceData`` dataclass and returned.

Configuration (.env)
--------------------
APIFY_API_TOKEN   — required; your Apify API token
BLINKIT_LAT       — latitude for location-based pricing  (default: Delhi NCR)
BLINKIT_LON       — longitude for location-based pricing (default: Delhi NCR)
"""

import asyncio
import uuid
from typing import Optional

import structlog

from app.config import settings
from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

ACTOR_ID = "jocular_quisling/blinkit-product-scraper"
BLINKIT_BASE_URL = "https://blinkit.com"


class BlinkitScraper(BaseScraper):
    platform_slug = "blinkit"

    # ── Public interface ──────────────────────────────────────────────────────

    async def fetch_price(
        self,
        product_id: uuid.UUID,
        product_name: str = "",
    ) -> Optional[PriceData]:
        """
        Search Blinkit via Apify for ``product_name`` and return the best
        matching price.  Returns ``None`` when no token is configured or no
        results are found.
        """
        if not settings.APIFY_API_TOKEN:
            log.warning("blinkit_apify_token_missing")
            return None

        if not product_name:
            log.warning("blinkit_apify_no_product_name", product_id=str(product_id))
            return None

        try:
            loop = asyncio.get_event_loop()
            items: list[dict] = await loop.run_in_executor(
                None,
                self._run_actor,
                product_name,
            )
        except Exception as exc:
            log.warning("blinkit_apify_actor_error", error=str(exc), product_name=product_name)
            raise ScraperError(str(exc)) from exc

        if not items:
            log.info("blinkit_apify_no_results", product_name=product_name)
            return None

        # Pick the best-ranked (lowest organic_rank) available item
        available = [i for i in items if i.get("in_stock", False)]
        best = min(available or items, key=lambda i: i.get("organic_rank", 999))

        return self._map_item(best)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _run_actor(self, query: str) -> list[dict]:
        """
        Synchronous call to the Apify actor.  Runs in a thread executor so it
        does not block the async event loop.
        """
        from apify_client import ApifyClient  # imported lazily to keep startup fast

        client = ApifyClient(settings.APIFY_API_TOKEN)
        run = client.actor(ACTOR_ID).call(
            run_input={
                "queries": [query],
                "lat": settings.BLINKIT_LAT,
                "lon": settings.BLINKIT_LON,
                "max_pages": 1,       # 1 page is enough for a single-product lookup
                "use_proxy": True,    # required by this actor
            }
        )
        dataset_id: str = run.get("defaultDatasetId", "")
        if not dataset_id:
            return []
        return list(client.dataset(dataset_id).iterate_items())

    @staticmethod
    def _map_item(item: dict) -> PriceData:
        """Map a single Apify dataset item to a ``PriceData`` instance."""
        price = float(item.get("price") or 0)
        mrp = float(item.get("mrp") or price)
        in_stock: bool = bool(item.get("in_stock", True))

        discount_pct = 0.0
        if mrp and mrp > price:
            discount_pct = round((mrp - price) / mrp * 100, 1)

        # Image: actor returns a list or a single URL
        images = item.get("images") or []
        image_url: Optional[str] = images[0] if images else None

        # Build canonical Blinkit product URL from slug if available
        product_id_str = str(item.get("product_id") or item.get("variant_id") or "")
        slug = item.get("slug") or product_id_str
        product_url = f"{BLINKIT_BASE_URL}/prn/{slug}" if slug else None

        return PriceData(
            platform_id="",                    # filled in by PriceEngine
            platform_slug="blinkit",
            price=price,
            original_price=mrp if mrp != price else None,
            discount_percent=discount_pct,
            is_available=in_stock,
            delivery_time_minutes=10,          # Blinkit's standard promise
            platform_product_id=product_id_str or None,
            platform_product_url=product_url,
            platform_image_url=image_url,
            source="apify",
        )
