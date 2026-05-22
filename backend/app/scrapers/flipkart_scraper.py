"""Flipkart Minutes (quick-commerce) scraper — falls back to Flipkart search API."""
import uuid
from typing import Optional
from urllib.parse import quote

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class FlipkartScraper(BaseScraper):
    platform_slug = "flipkart"
    BASE_URL = "https://www.flipkart.com"
    # Flipkart's internal search API used by the web app
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
                    "otracker1": "AS_Query",
                    "as-pos": "1",
                    "as-type": "RECENT",
                    "suggestionId": "",
                    "as-backfill": "on",
                    "page": "1",
                    "sort": "relevance",
                    "type": "search",
                    "fl": "true",
                },
                headers={
                    "X-User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop",
                    "Accept": "application/json",
                    "x-channel": "web",
                },
            )
            data = response.json()
            # Navigate the nested SLOT / WIDGET / product payload
            slots = (
                data.get("RESPONSE", {})
                .get("slots", [])
            )
            product_item = None
            for slot in slots:
                widget = slot.get("widget", {})
                if widget.get("type") == "PRODUCT_SUMMARY":
                    product_item = (
                        widget.get("data", {})
                        .get("products", [{}])[0]
                        .get("productInfo", {})
                        .get("value", {})
                    )
                    break
            if not product_item:
                return None

            pricing = product_item.get("pricing", {})
            mrp_raw = pricing.get("mrp", {}).get("decimalValue")
            price_raw = pricing.get("finalPrice", {}).get("decimalValue") or mrp_raw
            if not price_raw:
                return None

            mrp = float(mrp_raw)
            price = float(price_raw)
            in_stock = not product_item.get("availability", {}).get("isOutOfStock", True)
            pid = product_item.get("id", "")
            url = f"{self.BASE_URL}/product/{pid}" if pid else self.BASE_URL

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp and mrp > price else 0,
                is_available=in_stock,
                delivery_time_minutes=10,
                platform_product_id=pid,
                platform_product_url=url,
                platform_image_url=product_item.get("media", {}).get("images", [{}])[0].get("url"),
                source="scrape",
            )
        except Exception as exc:
            log.warning("flipkart_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
