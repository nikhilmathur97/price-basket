"""BigBasket scraper."""
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)


class BigBasketScraper(BaseScraper):
    platform_slug = "bigbasket"
    BASE_URL = "https://www.bigbasket.com"
    SEARCH_API = "https://www.bigbasket.com/product/get-products/"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        try:
            response = await self._get(
                self.SEARCH_API,
                params={"slug": str(product_id), "page": 1},
                headers={"x-channel": "BB-WEB"},
            )
            data = response.json()
            products = data.get("tab_info", [{}])[0].get("prod_list", [])
            if not products:
                return None

            item = products[0]
            pricing = item.get("pricing", {}).get("discount", {})
            mrp = float(pricing.get("mrp", 0))
            price = float(pricing.get("pricenow", mrp))
            in_stock = item.get("w", {}).get("oos") == "0"

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=float(pricing.get("disc_pct", 0)),
                discount_label=pricing.get("disc_lbl"),
                is_available=in_stock,
                delivery_time_minutes=30,
                platform_product_id=str(item.get("id", "")),
                platform_product_url=f"{self.BASE_URL}{item.get('absolute_url', '')}",
                platform_image_url=item.get("images", [{}])[0].get("s"),
                source="scrape",
            )
        except Exception as exc:
            log.warning("bigbasket_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
