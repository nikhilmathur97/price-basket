"""Swiggy Instamart scraper."""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class InstamartScraper(BaseScraper):
    platform_slug = "instamart"
    BASE_URL = "https://www.swiggy.com/instamart"
    SEARCH_API = "https://www.swiggy.com/mapi/instamart/home"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                "https://www.swiggy.com/mapi/instamart/search",
                params={"pageNumber": 0, "searchResultsOffset": 0, "query": query},
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "_tid": "d7c5bc3f-49f8-4a4b-8f3c-b1c4b9f13a2b",
                    "rid": "c9d5ac8f-71a4-4c5b-8e61-1f2f3a4b5c6d",
                },
            )
            data = response.json()
            cards = (
                data.get("data", {})
                .get("widgets", [{}])[0]
                .get("data", {})
                .get("stores", [{}])[0]
                .get("skus", [])
            )
            if not cards:
                return None

            item = cards[0]
            mrp = float(item.get("strike_price", 0))
            price = float(item.get("price", mrp))
            in_stock = item.get("availability", {}).get("available_quantity", 0) > 0

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp and mrp != price else 0,
                is_available=in_stock,
                delivery_time_minutes=20,
                platform_product_id=item.get("id"),
                platform_product_url=f"{self.BASE_URL}/product/{item.get('id')}",
                source="scrape",
            )
        except Exception as exc:
            log.warning("instamart_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
