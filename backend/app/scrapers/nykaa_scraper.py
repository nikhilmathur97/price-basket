"""
Nykaa Now scraper.
Nykaa Now is Nykaa's quick-commerce beauty/wellness channel.
Uses Nykaa's public product search API.
"""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class NykaaScraper(BaseScraper):
    platform_slug = "nykaa"
    BASE_URL = "https://www.nykaa.com"
    SEARCH_API = "https://www.nykaa.com/sp/search/v1"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_API,
                params={
                    "q": query,
                    "searchType": "Manual",
                    "page": 0,
                    "size": 1,
                    "channel": "web",
                },
                headers={
                    "Accept": "application/json",
                    "Referer": f"{self.BASE_URL}/search/result/?q={query}",
                    "x-channel": "web",
                },
            )
            data = response.json()
            products = (
                data.get("response", {})
                .get("products", [])
            )
            if not products:
                return None

            item = products[0]
            price = float(item.get("price", 0))
            mrp = float(item.get("mrp", price))
            discount = round((mrp - price) / mrp * 100, 1) if mrp > price else 0
            pid = str(item.get("id", ""))
            slug = item.get("slug", "")

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=discount,
                is_available=item.get("inStock", True),
                delivery_time_minutes=60,  # Nykaa Now: 1-hr delivery in select cities
                platform_product_id=pid,
                platform_product_url=f"{self.BASE_URL}/{slug}/p/{pid}" if slug else self.BASE_URL,
                platform_image_url=item.get("imageUrl"),
                source="scrape",
            )
        except Exception as exc:
            log.warning("nykaa_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
