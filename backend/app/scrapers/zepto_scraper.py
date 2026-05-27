"""
Zepto scraper — Playwright-based (bypasses Cloudflare).

Strategy
--------
1. Open https://www.zeptonow.com/search?query=<query> in a real Chromium browser.
2. Intercept the JSON response from POST bff-gateway.zepto.com/user-search-service/api/v3/search.
3. Parse the layout-based response structure.

Response structure (confirmed via network interception):
  data["layout"][x]
    widget["widgetName"]  → must contain "SEARCHED_PRODUCTS" or "PRODUCT"
    widget["data"]["resolver"]["data"]["items"][y]["productResponse"]
      productResponse["product"]["name"]                    → product name
      productResponse["discountedSellingPrice"]             → price in PAISE
      productResponse["mrp"]                                → MRP in PAISE
      productResponse["productVariant"]["images"][0]["path"] → image
      productResponse["productVariant"]["quantity"]         → quantity
      productResponse["productVariant"]["unitOfMeasure"]    → unit
      productResponse["outOfStock"]                         → bool

Note: Zepto prices are in PAISE (1/100 rupee). Divide by 100.
"""

import asyncio
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.config import settings
from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

ZEPTO_BASE = "https://www.zeptonow.com"


def _paise_to_rupees(val) -> Optional[float]:
    """Convert paise integer to rupees float."""
    if val is None:
        return None
    try:
        v = float(val)
        # Zepto stores prices in paise; common items > ₹5 → > 500 paise
        if v > 500:
            return round(v / 100.0, 2)
        return v
    except Exception:
        return None


def _parse_layout(data: dict) -> list[dict]:
    """
    Extract product dicts from a Zepto /api/v3/search response.
    Returns list of normalised dicts.
    """
    products = []
    layout = data.get("layout", [])

    for widget in layout:
        widget_name = widget.get("widgetName", "")
        if "SEARCHED_PRODUCTS" not in widget_name and "PRODUCT" not in widget_name:
            continue

        items = (
            widget.get("data", {})
            .get("resolver", {})
            .get("data", {})
            .get("items", [])
        )

        for item in items:
            pr      = item.get("productResponse", item)
            product = pr.get("product", {})
            variant = pr.get("productVariant", {})

            name        = product.get("name", "")
            price       = _paise_to_rupees(pr.get("discountedSellingPrice") or pr.get("mrp"))
            mrp         = _paise_to_rupees(pr.get("mrp") or variant.get("mrp"))
            out_of_stock = pr.get("outOfStock", False)

            # Image
            images = variant.get("images", [])
            image  = ""
            if images:
                path = images[0].get("path", images[0].get("url", ""))
                if path:
                    image = path if path.startswith("http") else f"https://cdn.zeptonow.com/production/{path}"

            # Unit
            qty  = variant.get("quantity", "")
            uom  = variant.get("unitOfMeasure", "")
            unit = f"{qty} {uom}".strip() if (qty or uom) else ""

            # Product ID / URL
            pid = str(pr.get("productId") or product.get("id") or "")
            url = f"{ZEPTO_BASE}/product/{pid}" if pid else None

            if name and price and price > 0:
                products.append({
                    "name":      name,
                    "price":     price,
                    "mrp":       mrp or price,
                    "unit":      unit,
                    "image_url": image,
                    "in_stock":  not out_of_stock,
                    "pid":       pid,
                    "url":       url,
                })

    return products


class ZeptoScraper(BaseScraper):
    platform_slug = "zepto"

    async def fetch_price(
        self,
        product_id: uuid.UUID,
        product_name: str = "",
    ) -> Optional[PriceData]:
        query = product_name or str(product_id)
        if not query:
            return None

        try:
            return await self._fetch_playwright(query)
        except Exception as exc:
            log.warning("zepto_playwright_failed", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser

        lat = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
        lon = str(getattr(settings, "BLINKIT_LON", "77.2090"))

        captured: list[dict] = []

        async with get_browser() as browser:
            context = await browser.new_context(
                viewport={"width": 390, "height": 844},
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/17.0 Mobile/15E148 Safari/604.1"
                ),
                locale="en-IN",
                geolocation={"latitude": float(lat), "longitude": float(lon)},
                permissions=["geolocation"],
            )
            try:
                page = await context.new_page()

                async def on_response(response):
                    if (
                        "user-search-service/api/v3/search" in response.url
                        and response.status == 200
                    ):
                        try:
                            data = await response.json()
                            captured.append(data)
                        except Exception:
                            pass

                page.on("response", on_response)

                await page.goto(
                    f"{ZEPTO_BASE}/search?query={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)
                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _parse_layout(data)
            if products:
                best  = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                return PriceData(
                    platform_id="",
                    platform_slug="zepto",
                    price=price,
                    original_price=mrp if mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    is_available=best["in_stock"],
                    delivery_time_minutes=8,
                    platform_product_id=best["pid"] or None,
                    platform_product_url=best["url"],
                    platform_image_url=best["image_url"] or None,
                    source="scrape",
                )

        log.info("zepto_no_result", query=query)
        return None
