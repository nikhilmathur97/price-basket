"""
JioMart Express scraper — Playwright-based with confirmed API interception.

Strategy
--------
1. Open https://www.jiomart.com in Chromium with stealth JS.
2. Set pincode via the page's own API (which sets auth cookies).
3. Navigate to search page and intercept the deliverable/products API.
4. Parse the items[] response.

Confirmed API (May 2026):
  GET /ext/vertex/application/api/v1.0/deliverable/products?page_size=12
  → items[].{name, price, mrp, images[0].url, uid}

Fallback: DOM scraping with updated selectors.
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

JIOMART_BASE = "https://www.jiomart.com"

_CHROME_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}


def _parse_price(val) -> Optional[float]:
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _parse_item(item: dict) -> Optional[dict]:
    """Parse a product item from JioMart's deliverable/products API."""
    name = (
        item.get("name", "")
        or item.get("display_name", "")
        or item.get("short_description", "")
    )
    price = _parse_price(
        item.get("price")
        or item.get("offer_price")
        or item.get("selling_price")
        or item.get("sp")
    )
    mrp = _parse_price(
        item.get("mrp")
        or item.get("original_price")
        or item.get("marked_price")
    ) or price

    images = item.get("images", [])
    image = ""
    if images:
        if isinstance(images[0], dict):
            image = images[0].get("url", "") or images[0].get("secure_url", "")
        elif isinstance(images[0], str):
            image = images[0]

    pid = str(item.get("uid", "") or item.get("id", "") or item.get("product_id", ""))

    if name and price and price > 0:
        return {
            "name":      name,
            "price":     price,
            "mrp":       mrp or price,
            "image_url": image,
            "pid":       pid,
        }
    return None


class JioMartScraper(BaseScraper):
    platform_slug = "jiomart"

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
            log.warning("jiomart_playwright_failed", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser, apply_stealth

        captured_api: list[dict] = []

        async with get_browser() as browser:
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-IN",
                extra_http_headers=_CHROME_HEADERS,
            )
            try:
                page = await context.new_page()
                await apply_stealth(page)

                # Intercept JioMart product API responses
                async def on_response(response):
                    url = response.url
                    if "jiomart.com" not in url:
                        return
                    if response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" not in ct:
                        return
                    if "deliverable/products" in url or "catalog" in url:
                        try:
                            data = await response.json()
                            if isinstance(data, dict):
                                captured_api.append(data)
                        except Exception:
                            pass

                page.on("response", on_response)

                # Step 1: Visit homepage to establish session
                await page.goto(JIOMART_BASE, wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(1)

                # Step 2: Set pincode via the page's own API (sets auth cookies)
                await page.evaluate(
                    """async () => {
                        try {
                            await fetch('/api/service/application/logistics/v1.0/pincode/400001',
                                {headers: {Accept: 'application/json'}});
                        } catch(e) {}
                    }"""
                )
                await asyncio.sleep(1)

                # Step 3: Navigate to search
                await page.goto(
                    f"{JIOMART_BASE}/search/{quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=35_000,
                )
                await asyncio.sleep(5)

                # Step 4: If no API data captured, try calling the API directly from browser
                if not captured_api:
                    result = await page.evaluate(
                        """async (q) => {
                            try {
                                const r = await fetch(
                                    '/ext/vertex/application/api/v1.0/deliverable/products?page_size=12&q=' + encodeURIComponent(q),
                                    {headers: {Accept: 'application/json'}}
                                );
                                if (r.ok) return await r.json();
                                return null;
                            } catch(e) { return null; }
                        }""",
                        query,
                    )
                    if result and isinstance(result, dict):
                        captured_api.append(result)

                # Step 5: DOM fallback
                dom_products = []
                if not captured_api:
                    dom_products = await page.evaluate(
                        """() => {
                            const out = [];
                            const cardSelectors = [
                                '[class*="sku-card"]', '[class*="product-item"]',
                                '[id*="product_"]', '[class*="ProductCard"]',
                                '[class*="product_card"]', '[data-product-id]',
                                '.product-card', 'li[class*="product"]',
                                '[class*="item-card"]',
                            ];
                            let cards = [];
                            for (const sel of cardSelectors) {
                                const found = document.querySelectorAll(sel);
                                if (found.length > 0) { cards = Array.from(found); break; }
                            }
                            cards.forEach(card => {
                                try {
                                    const nameEl = card.querySelector(
                                        '[class*="clsgetname"],[class*="product-title"],'
                                        + '[class*="name"],[class*="title"],h3,h4'
                                    );
                                    const name = nameEl?.textContent?.trim();
                                    const priceEl = card.querySelector(
                                        '[class*="offer-price"],[class*="final-price"],'
                                        + '[id*="final_price"],[class*="selling"],[class*="Price"],'
                                        + '[class*="price"]:not([class*="mrp"]):not([class*="strike"])'
                                    );
                                    const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '');
                                    const price = priceText ? parseFloat(priceText) : 0;
                                    const mrpEl = card.querySelector(
                                        '[class*="line-through"],[class*="strike"],[class*="mrp"],'
                                        + '[id*="price_label"],[class*="original"]'
                                    );
                                    const mrpText = mrpEl?.textContent?.replace(/[^0-9.]/g, '');
                                    const mrp = mrpText ? parseFloat(mrpText) : price;
                                    const img = card.querySelector(
                                        'img[src*="jiostatic"], img[src*="jiomart"], img'
                                    )?.src || '';
                                    const pid = card.getAttribute('data-product-id')
                                        || card.id?.replace('product_', '') || '';
                                    if (name && price > 0) {
                                        out.push({name, price, mrp: mrp || price, image_url: img, pid});
                                    }
                                } catch(e) {}
                            });
                            return out;
                        }"""
                    )

                await page.close()
            finally:
                await context.close()

        # Parse API responses
        for data in captured_api:
            items = (
                data.get("items", [])
                or data.get("data", {}).get("products", [])
                or data.get("products", [])
                or []
            )
            products = []
            for item in items:
                p = _parse_item(item)
                if p:
                    products.append(p)
            if products:
                best  = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                pid   = best["pid"]
                return PriceData(
                    platform_id="",
                    platform_slug="jiomart",
                    price=price,
                    original_price=mrp if mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    is_available=True,
                    delivery_time_minutes=30,
                    platform_product_id=pid or None,
                    platform_product_url=f"{JIOMART_BASE}/p/{pid}" if pid else None,
                    platform_image_url=best.get("image_url") or None,
                    source="scrape",
                )

        # Parse DOM results
        if dom_products:
            best  = dom_products[0]
            price = float(best["price"])
            mrp   = float(best.get("mrp") or price)
            pid   = str(best.get("pid") or "")
            return PriceData(
                platform_id="",
                platform_slug="jiomart",
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                is_available=True,
                delivery_time_minutes=30,
                platform_product_id=pid or None,
                platform_product_url=f"{JIOMART_BASE}/p/{pid}" if pid else None,
                platform_image_url=best.get("image_url") or None,
                source="scrape",
            )

        log.info("jiomart_no_result", query=query)
        return None
