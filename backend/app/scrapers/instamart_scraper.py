"""Swiggy Instamart scraper — uses Swiggy's internal search API."""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

# Default coords: Bengaluru (Swiggy HQ city, best coverage)
DEFAULT_LAT = "12.9716"
DEFAULT_LNG = "77.5946"


class InstamartScraper(BaseScraper):
    platform_slug = "instamart"
    BASE_URL = "https://www.swiggy.com/instamart"
    SEARCH_API = "https://www.swiggy.com/mapi/instamart/search"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_API,
                params={
                    "pageNumber": 0,
                    "searchResultsOffset": 0,
                    "query": query,
                    "layoutType": "GROCERY_SEARCH",
                    "isPreSearchTag": "false",
                    "highConfidencePageNo": 0,
                    "lowConfidencePageNo": 0,
                },
                headers={
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "_tid": "d7c5bc3f-49f8-4a4b-8f3c-b1c4b9f13a2b",
                    "rid": "c9d5ac8f-71a4-4c5b-8e61-1f2f3a4b5c6d",
                    "deviceId": "web-pba001",
                    "Referer": f"https://www.swiggy.com/instamart/search?query={query}",
                    "Origin": "https://www.swiggy.com",
                },
            )
            data = response.json()

            # Walk multiple possible response shapes
            skus = self._extract_skus(data)
            if not skus:
                return None

            item = skus[0]
            mrp = float(item.get("strike_price") or item.get("mrp") or 0)
            price = float(item.get("price") or item.get("final_price") or mrp)
            if price <= 0:
                price = mrp
            if price <= 0:
                return None

            avail = item.get("availability") or {}
            in_stock = (
                avail.get("available_quantity", 1) > 0
                if isinstance(avail, dict)
                else bool(avail)
            )

            item_id = str(item.get("id") or item.get("product_id") or "")
            image_url = (
                item.get("img_url")
                or item.get("image_url")
                or (item.get("images") or [{}])[0].get("url")
            )

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=in_stock,
                delivery_time_minutes=15,
                platform_product_id=item_id,
                platform_product_url=f"{self.BASE_URL}/product/{item_id}" if item_id else None,
                platform_image_url=image_url,
                source="scrape",
            )
        except Exception as exc:
            log.warning("instamart_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    @staticmethod
    def _extract_skus(data: dict) -> list:
        """Walk multiple response shapes to find the product list."""
        # Shape 1: data.widgets[0].data.stores[0].skus
        try:
            widgets = data["data"]["widgets"]
            for widget in widgets:
                stores = widget.get("data", {}).get("stores", [])
                if stores:
                    skus = stores[0].get("skus", [])
                    if skus:
                        return skus
        except (KeyError, IndexError, TypeError):
            pass

        # Shape 2: data.products or data.results
        try:
            items = data.get("data", {}).get("products") or data.get("products") or []
            if items:
                return items
        except (AttributeError, TypeError):
            pass

        # Shape 3: flat items list
        try:
            items = data.get("items") or data.get("results") or []
            if items:
                return items
        except (AttributeError, TypeError):
            pass

        return []
