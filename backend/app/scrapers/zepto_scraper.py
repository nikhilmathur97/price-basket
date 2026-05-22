"""Zepto scraper — uses Zepto's public search API."""
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
        query = product_name or str(product_id)
        try:
            response = await self._post(
                self.SEARCH_API,
                json={
                    "query": query,
                    "pageNumber": 0,
                    "pageSize": 5,
                    "mode": "PRODUCT_SEARCH",
                    "currPage": 0,
                },
                headers={
                    "x-app-version": "11.20.3",
                    "x-platform": "WEB",
                    "store_id": "1",
                    "Content-Type": "application/json",
                    "Origin": "https://www.zeptonow.com",
                    "Referer": "https://www.zeptonow.com/",
                },
            )
            data = response.json()

            # Multiple paths the response might use
            items = (
                data.get("items")
                or data.get("data", {}).get("items")
                or data.get("results")
                or []
            )
            if not items:
                return None

            # Find first item with a valid productResponse
            item = None
            for raw in items:
                candidate = (
                    raw.get("productResponse")
                    or raw.get("product")
                    or raw
                )
                if candidate.get("mrp") or candidate.get("price"):
                    item = candidate
                    break
            if not item:
                return None

            # Prices are in paise (1/100 rupee)
            mrp_paise = item.get("mrp") or item.get("marketPrice") or 0
            price_paise = item.get("price") or item.get("discountedPrice") or mrp_paise
            mrp = float(mrp_paise) / 100
            price = float(price_paise) / 100
            in_stock = item.get("inventoryAvailable", item.get("available", True))
            product_id_str = str(item.get("productId") or item.get("id") or "")

            if price <= 0:
                return None

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=bool(in_stock),
                delivery_time_minutes=8,
                platform_product_id=product_id_str,
                platform_product_url=f"{self.BASE_URL}/product/{product_id_str}" if product_id_str else None,
                source="scrape",
            )
        except Exception as exc:
            log.warning("zepto_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc
