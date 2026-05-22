"""BigBasket BB Now scraper — uses BigBasket's search API with multiple fallback paths."""
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
    LISTING_API = "https://www.bigbasket.com/listing-svc/v2/products"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            # Try listing API first (more stable)
            try:
                response = await self._get(
                    self.LISTING_API,
                    params={
                        "slug": query,
                        "page": 1,
                        "tab": "prd",
                        "listingPageType": "srch",
                    },
                    headers={
                        "x-channel": "BB-WEB",
                        "Accept": "application/json",
                        "Referer": f"{self.BASE_URL}/ps/?q={query}",
                    },
                )
                data = response.json()
            except Exception:
                # Fall back to old endpoint
                response = await self._get(
                    self.SEARCH_API,
                    params={"slug": query, "page": 1},
                    headers={"x-channel": "BB-WEB"},
                )
                data = response.json()

            # Parse — handle both API response shapes
            products = (
                data.get("tab_info", [{}])[0].get("prod_list")
                or data.get("data", {}).get("product", {}).get("products")
                or data.get("products")
                or []
            )
            if not products:
                return None

            item = products[0]
            pricing = (
                item.get("pricing", {}).get("discount")
                or item.get("sp", {})
                or {}
            )
            mrp = float(
                pricing.get("mrp")
                or pricing.get("offer_price")
                or item.get("mrp", 0)
            )
            price = float(
                pricing.get("pricenow")
                or pricing.get("price")
                or item.get("sp", mrp)
            )
            if price <= 0:
                price = mrp

            # OOS check — "0" means in-stock on BigBasket
            oos_raw = (
                item.get("w", {}).get("oos")
                or item.get("availability", {}).get("oos_reason_code")
            )
            in_stock = str(oos_raw) in ("0", "None", "") if oos_raw is not None else True

            bb_id = str(item.get("id") or item.get("product_id") or "")
            url_path = item.get("absolute_url") or item.get("slug") or ""
            image_list = item.get("images") or []
            image_url = (image_list[0].get("s") or image_list[0].get("m")) if image_list else None

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=float(pricing.get("disc_pct") or 0),
                discount_label=pricing.get("disc_lbl"),
                is_available=in_stock,
                delivery_time_minutes=30,
                platform_product_id=bb_id,
                platform_product_url=f"{self.BASE_URL}{url_path}" if url_path else None,
                platform_image_url=image_url,
                source="scrape",
            )
        except Exception as exc:
            log.warning("bigbasket_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc
