"""JioMart Express scraper — uses JioMart's product search API."""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class JioMartScraper(BaseScraper):
    platform_slug = "jiomart"
    BASE_URL = "https://www.jiomart.com"
    # JioMart's internal search endpoint (JSON)
    SEARCH_API = "https://www.jiomart.com/catalog/product/get_json_data"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_API,
                params={
                    "q": query,
                    "cat_id": "",
                    "page_no": 1,
                    "page_size": 1,
                    "sort_by": "popularity",
                    "channel": "web",
                },
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "Referer": f"{self.BASE_URL}/search#query={query}",
                    "x-channel": "web",
                },
            )
            data = response.json()
            products = data.get("data", {}).get("products", [])
            if not products:
                return None

            item = products[0]
            price = float(item.get("price", {}).get("final_price", 0))
            mrp = float(item.get("price", {}).get("old_price", price))
            in_stock = item.get("stock_status") == "instock"
            pid = str(item.get("id", ""))
            url_key = item.get("url_key", "")

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=in_stock,
                delivery_time_minutes=30,
                platform_product_id=pid,
                platform_product_url=f"{self.BASE_URL}/{url_key}" if url_key else self.BASE_URL,
                platform_image_url=item.get("image_url"),
                source="scrape",
            )
        except Exception as exc:
            log.warning("jiomart_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
