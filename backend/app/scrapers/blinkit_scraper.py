"""
Blinkit scraper — Playwright-based (bypasses Cloudflare).

Strategy
--------
1. Open https://blinkit.com/s/?q=<query> in a real Chromium browser.
2. Intercept the JSON response from POST /v1/layout/search.
3. Parse the widget-based response structure.

Response structure (confirmed via network interception):
  data["response"]["snippets"][x]
    snippet["widget_type"]               → must contain "product_card"
    snippet["data"]["name"]["text"]      → product name
    snippet["data"]["normal_price"]["text"] → selling price e.g. "₹68"
    snippet["data"]["mrp"]["text"]       → MRP (optional)
    snippet["data"]["variant"]["text"]   → unit e.g. "1 L"
    snippet["data"]["image"]["url"]      → image URL

Config (.env):
  BLINKIT_LAT   latitude  (default: 28.6139  Delhi NCR)
  BLINKIT_LON   longitude (default: 77.2090  Delhi NCR)
"""

import asyncio
import re
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.config import settings
from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

BLINKIT_BASE = "https://blinkit.com"


def _parse_price(text) -> Optional[float]:
    """Parse price from text like '₹68' or '68.50'."""
    if text is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(text))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _parse_snippets(data: dict) -> list[dict]:
    """
    Extract product dicts from a Blinkit /v1/layout/search response.
    Returns list of normalised dicts with keys: name, price, mrp, unit, image_url, in_stock.
    """
    products = []
    snippets = data.get("response", {}).get("snippets", [])

    for snippet in snippets:
        if "product_card" not in snippet.get("widget_type", ""):
            continue
        d = snippet.get("data", {})

        name = (
            d.get("name", {}).get("text", "")
            or d.get("display_name", {}).get("text", "")
        )
        price = _parse_price(d.get("normal_price", {}).get("text"))
        mrp   = _parse_price(d.get("mrp", {}).get("text")) or price
        unit  = d.get("variant", {}).get("text", "")

        # Image — primary field, then media_container fallback
        image = d.get("image", {}).get("url", "")
        if not image:
            items = d.get("media_container", {}).get("items", [])
            if items:
                image = items[0].get("image", {}).get("url", "")

        # Platform product ID / URL
        pid  = str(d.get("product_id", "") or d.get("id", "") or "")
        slug = d.get("slug", "") or pid
        url  = f"{BLINKIT_BASE}/prn/{slug}" if slug else None

        if name and price and price > 0:
            products.append({
                "name":      name,
                "price":     price,
                "mrp":       mrp or price,
                "unit":      unit,
                "image_url": image,
                "in_stock":  True,
                "pid":       pid,
                "url":       url,
            })

    return products


class BlinkitScraper(BaseScraper):
    platform_slug = "blinkit"

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
            log.warning("blinkit_playwright_failed", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser

        lat = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
        lon = str(getattr(settings, "BLINKIT_LON", "77.2090"))

        captured: list[dict] = []

        async with get_browser() as browser:
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-IN",
                geolocation={"latitude": float(lat), "longitude": float(lon)},
                permissions=["geolocation"],
            )
            try:
                page = await context.new_page()

                async def on_response(response):
                    if (
                        "blinkit.com/v1/layout/search" in response.url
                        and response.status == 200
                    ):
                        try:
                            data = await response.json()
                            captured.append(data)
                        except Exception:
                            pass

                page.on("response", on_response)

                await page.goto(
                    f"{BLINKIT_BASE}/s/?q={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(2)
                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _parse_snippets(data)
            if products:
                best = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                return PriceData(
                    platform_id="",
                    platform_slug="blinkit",
                    price=price,
                    original_price=mrp if mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    is_available=best["in_stock"],
                    delivery_time_minutes=10,
                    platform_product_id=best["pid"] or None,
                    platform_product_url=best["url"],
                    platform_image_url=best["image_url"] or None,
                    source="scrape",
                )

        log.info("blinkit_no_result", query=query)
        return None
