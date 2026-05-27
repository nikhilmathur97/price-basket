"""
Swiggy Instamart scraper — Playwright-based (bypasses Cloudflare).

Strategy
--------
1. Open https://www.swiggy.com/instamart/search?query=<query> in Chromium.
2. Intercept JSON responses from /api/instamart/search (any variant).
3. Parse the widget/SKU-based response structure.

Response structure (confirmed via network interception):
  data["data"]["widgets"][x]["data"]["skus"][y]
    sku["display_name"]                   → product name
    sku["price"]["offer_price"]           → selling price
    sku["price"]["mrp"]                   → MRP
    sku["images"][0]["url"]               → image
    sku["unit_quantity"]                  → unit e.g. "500 g"
    sku["is_available"]                   → bool
"""

import asyncio
import re
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

SWIGGY_BASE = "https://www.swiggy.com"


def _parse_price(val) -> Optional[float]:
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _extract_skus(data: dict) -> list[dict]:
    """Walk multiple response shapes to find the SKU list."""
    # Shape 1: data.data.widgets[].data.skus[]
    widgets = (
        data.get("data", {}).get("widgets", [])
        or data.get("widgets", [])
        or []
    )
    skus = []
    for widget in widgets:
        w_skus = widget.get("data", {}).get("skus", []) or widget.get("skus", []) or []
        skus.extend(w_skus)

    # Shape 2: data.data.skus[]
    if not skus:
        skus = data.get("data", {}).get("skus", []) or data.get("skus", []) or []

    return skus


def _parse_response(data: dict) -> list[dict]:
    products = []
    for sku in _extract_skus(data):
        name      = sku.get("display_name") or sku.get("name", "")
        price_obj = sku.get("price", {})
        if isinstance(price_obj, dict):
            price = _parse_price(price_obj.get("offer_price") or price_obj.get("mrp"))
            mrp   = _parse_price(price_obj.get("mrp")) or price
        else:
            price = _parse_price(price_obj)
            mrp   = price

        imgs  = sku.get("images", [])
        image = imgs[0].get("url", "") if imgs else ""
        pid   = str(sku.get("id") or sku.get("sku_id") or "")

        if name and price and price > 0:
            products.append({
                "name":      name,
                "price":     price,
                "mrp":       mrp or price,
                "unit":      sku.get("unit_quantity", ""),
                "image_url": image,
                "in_stock":  sku.get("is_available", True),
                "pid":       pid,
                "url":       None,
            })
    return products


class InstamartScraper(BaseScraper):
    platform_slug = "instamart"

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
            log.warning("instamart_playwright_failed", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser

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
            )
            try:
                page = await context.new_page()

                async def on_response(response):
                    url = response.url
                    if (
                        "swiggy.com" in url
                        and "instamart" in url
                        and "search" in url
                        and response.status == 200
                    ):
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            try:
                                data = await response.json()
                                captured.append(data)
                            except Exception:
                                pass

                page.on("response", on_response)

                await page.goto(
                    f"{SWIGGY_BASE}/instamart/search?query={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)

                # Fallback: call the API from within the browser context
                # (has session cookies + CSRF tokens already set)
                if not captured:
                    result = await page.evaluate(
                        """async (q) => {
                            try {
                                const r = await fetch(
                                    '/api/instamart/search/v2?offset=0&ageConsent=false'
                                    + '&storeId=&primaryStoreId=&secondaryStoreId=',
                                    {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({
                                            facets: [], sortAttribute: '', query: q,
                                            search_results_offset: '0',
                                            page_type: 'INSTAMART_SEARCH_PAGE',
                                            is_pre_search_tag: false
                                        })
                                    }
                                );
                                if (r.ok) return await r.json();
                                return null;
                            } catch(e) { return null; }
                        }""",
                        query,
                    )
                    if result:
                        captured.append(result)

                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _parse_response(data)
            if products:
                best  = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                return PriceData(
                    platform_id="",
                    platform_slug="instamart",
                    price=price,
                    original_price=mrp if mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    is_available=best["in_stock"],
                    delivery_time_minutes=15,
                    platform_product_id=best["pid"] or None,
                    platform_product_url=best["url"],
                    platform_image_url=best["image_url"] or None,
                    source="scrape",
                )

        log.info("instamart_no_result", query=query)
        return None
