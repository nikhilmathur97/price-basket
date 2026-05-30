"""
JioMart Express scraper — Playwright-based with DOM scraping.

Strategy
--------
1. Open https://www.jiomart.com/search#<query> in Chromium with stealth JS.
2. Wait for React to render product cards (page is a Fynd-based SPA).
3. DOM-scrape product cards using confirmed selectors.
4. The catalog API (/api/service/application/catalog/v1.0/catalog/items/) requires
   an auth token that is not accessible from the browser context, so we use DOM.

Confirmed DOM selectors (May 2026):
  Product cards: [id^="product_"] or [class*="sku-card"] or [class*="product-item"]
  Name:  [class*="clsgetname"] or [class*="product-title"] or h3/h4
  Price: [id*="final_price"] or [class*="offer-price"] or [class*="final-price"]
  MRP:   [class*="line-through"] or [class*="strike"] or [id*="price_label"]
  Image: img[src*="jiostatic"] or img[src*="jiomart"]

Fallback: if live scraping fails, return an estimated price via fallback_pricer.
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

# DOM extraction JS — tries multiple selector strategies
_DOM_EXTRACT_JS = """
() => {
    const out = [];

    // Strategy 1: [id^="product_"] cards (Fynd/JioMart SPA)
    let cards = Array.from(document.querySelectorAll('[id^="product_"]'));

    // Strategy 2: class-based selectors
    if (!cards.length) {
        const selectors = [
            '[class*="sku-card"]',
            '[class*="product-item"]',
            '[class*="ProductCard"]',
            '[class*="product_card"]',
            '[data-product-id]',
            '.product-card',
        ];
        for (const sel of selectors) {
            const found = document.querySelectorAll(sel);
            if (found.length > 0) { cards = Array.from(found); break; }
        }
    }

    // Strategy 3: look for price elements and walk up to card
    if (!cards.length) {
        const priceEls = document.querySelectorAll('[id*="final_price"], [class*="offer-price"]');
        const seen = new Set();
        priceEls.forEach(el => {
            let node = el;
            for (let i = 0; i < 6; i++) {
                node = node.parentElement;
                if (!node) break;
                if (!seen.has(node) && node.querySelector('img')) {
                    seen.add(node);
                    cards.push(node);
                    break;
                }
            }
        });
    }

    cards.forEach(card => {
        try {
            // Name
            const nameEl = card.querySelector(
                '[class*="clsgetname"], [class*="product-title"], ' +
                '[class*="name"], [class*="title"], h3, h4, p[class*="name"]'
            );
            const name = nameEl ? nameEl.textContent.trim() : '';

            // Selling price
            const priceEl = card.querySelector(
                '[id*="final_price"], [class*="offer-price"], [class*="final-price"], ' +
                '[class*="selling"], [class*="Price"]:not([class*="mrp"]):not([class*="strike"]):not([class*="original"])'
            );
            const priceText = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, '') : '';
            const price = priceText ? parseFloat(priceText) : 0;

            // MRP
            const mrpEl = card.querySelector(
                '[class*="line-through"], [class*="strike"], [class*="mrp"], ' +
                '[id*="price_label"], [class*="original"], s, del'
            );
            const mrpText = mrpEl ? mrpEl.textContent.replace(/[^0-9.]/g, '') : '';
            const mrp = mrpText ? parseFloat(mrpText) : price;

            // Image
            const imgEl = card.querySelector(
                'img[src*="jiostatic"], img[src*="jiomart"], img[src*="cdn"], img'
            );
            const img = imgEl ? imgEl.src : '';

            // Product ID
            const pid = card.getAttribute('data-product-id')
                || card.id.replace('product_', '')
                || '';

            // URL
            const linkEl = card.querySelector('a[href]');
            const href = linkEl ? linkEl.href : '';

            if (name && price > 0) {
                out.push({name, price, mrp: mrp || price, image_url: img, pid, href});
            }
        } catch(e) {}
    });
    return out;
}
"""


def _parse_price(val) -> Optional[float]:
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _parse_item(item: dict) -> Optional[dict]:
    """Parse a product item from JioMart's API (if intercepted)."""
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
        or item.get("special_price")
    )
    mrp = _parse_price(
        item.get("mrp")
        or item.get("original_price")
        or item.get("marked_price")
        or item.get("max_price")
    ) or price

    images = item.get("images", [])
    image = ""
    if images:
        if isinstance(images[0], dict):
            image = images[0].get("url", "") or images[0].get("secure_url", "")
        elif isinstance(images[0], str):
            image = images[0]
    if not image:
        image = item.get("image", "") or item.get("thumbnail", "")

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
            result = await self._fetch_playwright(query)
            if result:
                return result
        except Exception as exc:
            log.warning("jiomart_playwright_failed", query=query, error=str(exc))

        # Fallback to estimated price
        log.info("jiomart_using_fallback", query=query)
        from app.scrapers.fallback_pricer import get_estimated_price
        return get_estimated_price("jiomart", query, product_id)

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

        captured_api: list[dict] = []

        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="jiomart",
                viewport={"width": 1280, "height": 900},
                extra_http_headers=_CHROME_HEADERS,
            )
            try:
                page = await context.new_page()

                # Intercept any JSON product responses (opportunistic)
                async def on_response(response):
                    url = response.url
                    if "jiomart.com" not in url:
                        return
                    if response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" not in ct:
                        return
                    if any(kw in url for kw in [
                        "deliverable/products", "catalog/items", "get_json_data",
                        "product/list", "v1.0/products", "search/products",
                    ]):
                        try:
                            data = await response.json()
                            if isinstance(data, dict):
                                captured_api.append(data)
                                log.debug("jiomart_api_captured", url=url[:80])
                        except Exception:
                            pass

                page.on("response", on_response)

                # Step 1: Visit homepage to establish session + set pincode cookie
                await page.goto(JIOMART_BASE, wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(1)

                # Step 2: Set pincode via the page's own API (sets auth cookies)
                await page.evaluate(
                    """async () => {
                        try {
                            await fetch(
                                '/api/service/application/logistics/v1.0/pincode/400001',
                                {headers: {Accept: 'application/json'}}
                            );
                        } catch(e) {}
                    }"""
                )
                await asyncio.sleep(1)

                # Step 3: Navigate to search (hash-based SPA routing)
                await page.goto(
                    f"{JIOMART_BASE}/search#{quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=35_000,
                )
                await asyncio.sleep(3)

                # Step 4: Wait for React to render product cards
                # Try multiple selectors
                for selector in [
                    '[id^="product_"]',
                    '[class*="sku-card"]',
                    '[class*="product-item"]',
                    '[data-product-id]',
                ]:
                    try:
                        await page.wait_for_selector(selector, timeout=5_000)
                        log.debug("jiomart_cards_found", selector=selector)
                        break
                    except Exception:
                        continue

                await asyncio.sleep(2)

                # Step 5: DOM extraction
                dom_products = await page.evaluate(_DOM_EXTRACT_JS)
                log.debug("jiomart_dom_products", count=len(dom_products) if dom_products else 0)

                # Step 6: If DOM failed, try scrolling to trigger lazy load
                if not dom_products:
                    await page.mouse.wheel(0, 500)
                    await asyncio.sleep(2)
                    dom_products = await page.evaluate(_DOM_EXTRACT_JS)

                await save_cookies(context, "jiomart")
                await page.close()
            finally:
                await context.close()

        # Parse API responses first (more reliable)
        for data in captured_api:
            items = (
                data.get("items", [])
                or data.get("data", {}).get("products", [])
                or data.get("products", [])
                or data.get("data", {}).get("items", [])
                or []
            )
            if not items and isinstance(data.get("data"), list):
                items = data["data"]

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
                log.info("jiomart_scraped_api", query=query, price=price, mrp=mrp, pid=pid)
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
            href  = best.get("href", "")
            log.info("jiomart_scraped_dom", query=query, price=price, mrp=mrp,
                     name=best.get("name", "")[:40])
            return PriceData(
                platform_id="",
                platform_slug="jiomart",
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                is_available=True,
                delivery_time_minutes=30,
                platform_product_id=pid or None,
                platform_product_url=href or (f"{JIOMART_BASE}/p/{pid}" if pid else None),
                platform_image_url=best.get("image_url") or None,
                source="scrape",
            )

        log.info("jiomart_no_result", query=query)
        return None
