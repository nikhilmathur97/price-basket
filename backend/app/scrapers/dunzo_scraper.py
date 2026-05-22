"""
Dunzo Daily scraper.
Dunzo was shut down in 2024; this scraper returns unavailable for all products
so the platform shows as "not available" rather than crashing.
When Dunzo relaunches (or is replaced), update SEARCH_API and the parse logic.
"""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class DunzoScraper(BaseScraper):
    platform_slug = "dunzo"
    BASE_URL = "https://www.dunzo.com"
    SEARCH_API = "https://api.dunzo.in/api/v2/search/products"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_API,
                params={"query": query, "limit": 1, "offset": 0},
                headers={
                    "Accept": "application/json",
                    "x-app-version": "latest",
                    "Referer": self.BASE_URL,
                },
            )
            data = response.json()
            items = data.get("data", {}).get("products", [])
            if not items:
                return None

            item = items[0]
            price = float(item.get("price", 0))
            mrp = float(item.get("market_price", price))
            in_stock = item.get("in_stock", False)

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=in_stock,
                delivery_time_minutes=15,
                platform_product_id=str(item.get("id", "")),
                platform_product_url=f"{self.BASE_URL}/product/{item.get('id', '')}",
                platform_image_url=item.get("image_url"),
                source="scrape",
            )
        except Exception as exc:
            log.warning("dunzo_scrape_error", error=str(exc))
            # Dunzo is defunct — return unavailable instead of propagating the error
            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=0.0,
                is_available=False,
                source="scrape",
            )
