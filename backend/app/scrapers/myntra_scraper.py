"""
Myntra M-Now scraper.
M-Now is Myntra's quick-commerce fashion/beauty channel.
Uses Myntra's public search API (same endpoint the web app uses).
"""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class MyntraScraper(BaseScraper):
    platform_slug = "myntra"
    BASE_URL = "https://www.myntra.com"
    SEARCH_API = "https://www.myntra.com/gateway/v2/search/{query}"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        url = f"https://www.myntra.com/gateway/v2/search/{query}"
        try:
            response = await self._get(
                url,
                params={"p": 1, "rows": 1, "o": 0, "plaEnabled": "false"},
                headers={
                    "Accept": "application/json",
                    "Referer": f"{self.BASE_URL}/{query}",
                    "x-location-context": "pincode=110001;source=IP",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
                },
            )
            data = response.json()
            products = data.get("products", [])
            if not products:
                return None

            item = products[0]
            price = float(item.get("price", 0))
            mrp = float(item.get("mrpPrice", price))
            discount = float(item.get("discountDisplayLabel", "0%").replace("%", "") or 0)
            pid = str(item.get("productId", ""))

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=discount,
                discount_label=item.get("discountDisplayLabel"),
                is_available=not item.get("isOutOfStock", False),
                delivery_time_minutes=30,  # M-Now: 30-min delivery
                platform_product_id=pid,
                platform_product_url=f"{self.BASE_URL}/{item.get('landingPageUrl', '')}",
                platform_image_url=f"https://assets.myntassets.com/assets/images/{pid}/1/image1.jpg",
                source="scrape",
            )
        except Exception as exc:
            log.warning("myntra_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
