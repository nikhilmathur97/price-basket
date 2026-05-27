"""
BigBasket BB Now scraper — Playwright-based (bypasses Cloudflare).

Strategy
--------
1. Open https://www.bigbasket.com/ps/?q=<query> in Chromium.
2. Intercept JSON responses from /product/get-products/ or /api/products/search.
3. Parse the tab_info-based response structure.

Response structure (confirmed via network interception):
  data["tab_info"][x]  (dict with arbitrary keys)
    → look for list values where items have "sp", "mrp", "desc" keys
    item["desc"]        → product name
    item["sp"]          → selling price
    item["mrp"]         → MRP
    item["img"]["s"]    → image URL (small)
    item["w"]           → weight/unit
    item["oos"]         → out-of-stock flag (0 = in stock)
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

BB_BASE = "https://www.bigbasket.com"


def _parse_price(val) -> Optional[float]:
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _parse_tab_info(data: dict) -> list[dict]:
    """Extract products from BigBasket tab_info response."""
    products = []
    tab_info = data.get("tab_info", [])

    for tab in tab_info:
        if not isinstance(tab, dict):
            continue
        for v in tab.values():
            if not (isinstance(v, list) and v and isinstance(v[0], dict)):
                continue
            # Check if this list contains product objects
            if not any(k in v[0] for k in ["sp", "mrp", "desc"]):
                continue
            for p in v:
                name  = p.get("desc", "")
                price = _parse_price(p.get("sp"))
                mrp   = _parse_price(p.get("mrp"))
                img   = p.get("img", {})
                image = img.get("s", "") if isinstance(img, dict) else ""
                pid   = str(p.get("id") or p.get("product_id") or "")

                if name and price and price > 0:
                    products.append({
                        "name":      name,
                        "price":     price,
                        "mrp":       mrp or price,
                        "unit":      p.get("w", ""),
                        "image_url": image,
                        "in_stock":  p.get("oos", 0) == 0,
                        "pid":       pid,
                        "url":       f"{BB_BASE}/pd/{p.get('slug', pid)}/" if pid else None,
                    })

    return products


class BigBasketScraper(BaseScraper):
    platform_slug = "bigbasket"

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
            log.warning("bigbasket_playwright_failed", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser

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
            )
            try:
                page = await context.new_page()

                async def on_response(response):
                    url = response.url
                    if (
                        "bigbasket.com" in url
                        and ("get-products" in url or "search" in url)
                        and response.status == 200
                    ):
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            try:
                                data = await response.json()
                                if data.get("tab_info"):
                                    captured.append(data)
                            except Exception:
                                pass

                page.on("response", on_response)

                await page.goto(
                    f"{BB_BASE}/ps/?q={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)

                # Fallback: call the API from within the browser context
                if not captured:
                    result = await page.evaluate(
                        """async (q) => {
                            try {
                                const r = await fetch(
                                    '/product/get-products/?q=' + encodeURIComponent(q) + '&nc=as',
                                    {headers: {Accept: 'application/json, text/plain, */*'}}
                                );
                                if (r.ok) return await r.json();
                                return null;
                            } catch(e) { return null; }
                        }""",
                        query,
                    )
                    if result and result.get("tab_info"):
                        captured.append(result)

                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _parse_tab_info(data)
            if products:
                best  = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                return PriceData(
                    platform_id="",
                    platform_slug="bigbasket",
                    price=price,
                    original_price=mrp if mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    is_available=best["in_stock"],
                    delivery_time_minutes=20,
                    platform_product_id=best["pid"] or None,
                    platform_product_url=best["url"],
                    platform_image_url=best["image_url"] or None,
                    source="scrape",
                )

        log.info("bigbasket_no_result", query=query)
        return None
