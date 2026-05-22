"""Flipkart Minutes scraper — uses Flipkart's search API with robust multi-path parsing."""
import re
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

_PRICE_RE = re.compile(r"[\d,]+(?:\.\d+)?")


class FlipkartScraper(BaseScraper):
    platform_slug = "flipkart"
    BASE_URL = "https://www.flipkart.com"
    SEARCH_API = "https://2.rome.api.flipkart.com/api/4/page/fetch"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_API,
                params={
                    "q": query,
                    "as": "on",
                    "as-show": "on",
                    "otracker": "AS_Query",
                    "page": "1",
                    "sort": "relevance",
                    "type": "search",
                    "fl": "true",
                },
                headers={
                    "X-User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 "
                        "FKUA/website/42/website/Desktop"
                    ),
                    "Accept": "application/json",
                    "x-channel": "web",
                    "Referer": f"https://www.flipkart.com/search?q={query}",
                },
            )
            data = response.json()
            item = self._extract_product(data)
            if not item:
                return None

            pricing = item.get("pricing", {})
            mrp = self._get_price(pricing, ["mrp", "maxRetailPrice"])
            price = self._get_price(pricing, ["finalPrice", "sellingPrice"]) or mrp
            if price <= 0:
                return None

            in_stock = not item.get("availability", {}).get("isOutOfStock", True)
            pid = str(item.get("id") or "")
            images = item.get("media", {}).get("images") or []
            image_url = images[0].get("url") if images else None

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=in_stock,
                delivery_time_minutes=10,
                platform_product_id=pid,
                platform_product_url=f"{self.BASE_URL}/product/{pid}" if pid else self.BASE_URL,
                platform_image_url=image_url,
                source="scrape",
            )
        except Exception as exc:
            log.warning("flipkart_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    @staticmethod
    def _extract_product(data: dict) -> Optional[dict]:
        """Walk Flipkart's slot/widget structure to find the first PRODUCT_SUMMARY."""
        slots = (
            data.get("RESPONSE", {}).get("slots")
            or data.get("slots")
            or []
        )
        for slot in slots:
            widget = slot.get("widget", {})
            if widget.get("type") in ("PRODUCT_SUMMARY", "PRODUCT_LISTING"):
                products = (
                    widget.get("data", {}).get("products")
                    or widget.get("data", {}).get("items")
                    or []
                )
                if products:
                    return (
                        products[0].get("productInfo", {}).get("value")
                        or products[0].get("value")
                        or products[0]
                    )
        return None

    @staticmethod
    def _get_price(pricing: dict, keys: list) -> float:
        for k in keys:
            val = pricing.get(k)
            if isinstance(val, dict):
                for vk in ("decimalValue", "value", "amount"):
                    if val.get(vk):
                        try:
                            return float(str(val[vk]).replace(",", ""))
                        except (ValueError, TypeError):
                            pass
            elif val:
                try:
                    return float(str(val).replace(",", ""))
                except (ValueError, TypeError):
                    pass
        return 0.0
