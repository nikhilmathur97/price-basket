"""JioMart Express scraper — uses JioMart's JSON search API."""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class JioMartScraper(BaseScraper):
    platform_slug = "jiomart"
    BASE_URL = "https://www.jiomart.com"
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
                    "page_size": 5,
                    "sort_by": "relevance",
                    "channel": "web",
                },
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "Referer": f"{self.BASE_URL}/search#query={query}",
                    "x-channel": "web",
                    "Origin": self.BASE_URL,
                },
            )
            data = response.json()

            # Handle multiple response shapes
            products = (
                data.get("data", {}).get("products")
                or data.get("products")
                or data.get("items")
                or []
            )
            if not products:
                return None

            item = products[0]
            price_data = item.get("price") or {}

            if isinstance(price_data, dict):
                price = float(price_data.get("final_price") or price_data.get("special_price") or 0)
                mrp = float(price_data.get("old_price") or price_data.get("regular_price") or price)
            else:
                price = float(price_data or item.get("final_price") or 0)
                mrp = float(item.get("mrp") or item.get("old_price") or price)

            if price <= 0:
                return None

            in_stock = str(item.get("stock_status") or item.get("is_in_stock") or "instock").lower() in (
                "instock", "in_stock", "1", "true"
            )
            pid = str(item.get("id") or item.get("product_id") or "")
            url_key = item.get("url_key") or item.get("slug") or ""
            image_url = item.get("image_url") or item.get("thumbnail")

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=in_stock,
                delivery_time_minutes=30,
                platform_product_id=pid,
                platform_product_url=f"{self.BASE_URL}/{url_key}" if url_key else self.BASE_URL,
                platform_image_url=image_url,
                source="scrape",
            )
        except Exception as exc:
            log.warning("jiomart_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc
