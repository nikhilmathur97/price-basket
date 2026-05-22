"""Zepto scraper."""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class ZeptoScraper(BaseScraper):
    platform_slug = "zepto"
    BASE_URL = "https://www.zeptonow.com"
    SEARCH_API = "https://api.zeptonow.com/api/v3/search"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        try:
            response = await self._post(
                self.SEARCH_API,
                json={
                    "query": str(product_id),
                    "pageNumber": 0,
                    "pageSize": 1,
                    "mode": "PRODUCT_SEARCH",
                    "currPage": 0,
                },
                headers={
                    "x-app-version": "11.20.3",
                    "x-platform": "WEB",
                    "store_id": "1",
                },
            )
            data = response.json()
            items = data.get("items", [])
            if not items:
                return None

            item = items[0].get("productResponse", {})
            mrp = float(item.get("mrp", 0)) / 100  # paise → rupees
            price = float(item.get("price", mrp * 100)) / 100
            in_stock = item.get("inventoryAvailable", False)

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp and mrp != price else 0,
                is_available=in_stock,
                delivery_time_minutes=8,
                platform_product_id=item.get("productId"),
                platform_product_url=f"{self.BASE_URL}/product/{item.get('productId')}",
                source="scrape",
            )
        except Exception as exc:
            log.warning("zepto_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
