"""
Flipkart Minutes scraper — Playwright-based with full stealth bypass.

Strategy
--------
1. Open https://www.flipkart.com/search?q=<query> in Chromium with stealth JS.
2. Intercept JSON API responses (Flipkart's internal product API).
3. Parse DOM for price data via JavaScript evaluation.
4. Multiple regex/JSON-LD fallback patterns on the HTML.
5. Persist cookies between runs to avoid repeated bot challenges.

Confirmed working patterns (May 2026):
  JSON blob: "finalPrice":{"value":<int>}
  CSS class: <div class="Nx9bqj">₹269</div>
  JSON-LD:   offers.price

If live scraping fails, returns None (no price shown for this platform).
"""
import asyncio
import json
import re
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

FLIPKART_BASE = "https://www.flipkart.com"

# ── Pattern A: inline script JSON blob ────────────────────────────────────────
_PRODUCT_RE = re.compile(
    r'"title"\s*:\s*"([^"]{5,120})"\s*(?:(?!"title").)*?"finalPrice"\s*:\s*\{[^}]*"value"\s*:\s*(\d+)',
    re.DOTALL,
)
_MRP_RE = re.compile(
    r'"mrpPrice"\s*:\s*\{[^}]*"value"\s*:\s*(\d+)',
)

# ── Pattern B: Flipkart's newer price rendering (2024+) ───────────────────────
_PRICE_DIV_RE = re.compile(
    r'class="(?:_30jeq3[^"]*|Nx9bqj[^"]*|_1_WHN1[^"]*|yRaY8j[^"]*|hl05au[^"]*)"[^>]*>₹([\d,]+)<',
)
_MRP_DIV_RE = re.compile(
    r'class="(?:_3I9_wc[^"]*|_2p6lqe[^"]*|_3auQ3N[^"]*|yRaY8j[^"]*)"[^>]*>₹([\d,]+)<',
)

# ── Pattern C: JSON-LD ─────────────────────────────────────────────────────────
_JSONLD_RE = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

_PID_RE = re.compile(r'/p/(itm[A-Za-z0-9]+)')


def _parse_price(text: str) -> Optional[float]:
    try:
        return float(str(text).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _extract_from_jsonld(html: str) -> Optional[tuple]:
    for m in _JSONLD_RE.finditer(html):
        try:
            data = json.loads(m.group(1))
            items = data if isinstance(data, list) else [data]
            for item in items:
                offers = item.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}
                price = _parse_price(offers.get("price") or offers.get("lowPrice"))
                if price and price > 0:
                    mrp = _parse_price(offers.get("highPrice")) or price
                    name = item.get("name", "")
                    return price, mrp, name
        except Exception:
            continue
    return None


def _extract_from_html(html: str, query: str) -> Optional[PriceData]:
    """Parse price from Flipkart HTML using multiple strategies."""
    # Detect bot block
    if len(html) < 2000:
        log.warning("flipkart_bot_detected", query=query, size=len(html))
        return None

    # Strategy A: inline script JSON blob
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
    price_script = next((s for s in scripts if "finalPrice" in s), None)
    if price_script:
        matches = _PRODUCT_RE.findall(price_script)
        real = [(t, int(p)) for t, p in matches if "access denied" not in t.lower() and int(p) > 0]
        if real:
            title, price = real[0]
            mrp_m = _MRP_RE.search(price_script)
            mrp = int(mrp_m.group(1)) if mrp_m else price
            pid_m = _PID_RE.search(html)
            pid = pid_m.group(1) if pid_m else ""
            return PriceData(
                platform_id="",
                platform_slug="flipkart",
                price=float(price),
                original_price=float(mrp) if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                is_available=True,
                delivery_time_minutes=10,
                platform_product_id=pid or None,
                platform_product_url=f"{FLIPKART_BASE}/p/{pid}" if pid else FLIPKART_BASE,
                platform_image_url=None,
                source="scrape",
            )

    # Strategy B: JSON-LD
    jsonld = _extract_from_jsonld(html)
    if jsonld:
        price, mrp, _ = jsonld
        pid_m = _PID_RE.search(html)
        pid = pid_m.group(1) if pid_m else ""
        return PriceData(
            platform_id="",
            platform_slug="flipkart",
            price=price,
            original_price=mrp if mrp > price else None,
            discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
            is_available=True,
            delivery_time_minutes=10,
            platform_product_id=pid or None,
            platform_product_url=f"{FLIPKART_BASE}/p/{pid}" if pid else FLIPKART_BASE,
            platform_image_url=None,
            source="scrape",
        )

    # Strategy C: price div regex
    price_m = _PRICE_DIV_RE.search(html)
    if price_m:
        price = _parse_price(price_m.group(1))
        if price and price > 0:
            mrp_m = _MRP_DIV_RE.search(html)
            mrp = _parse_price(mrp_m.group(1)) if mrp_m else price
            pid_m = _PID_RE.search(html)
            pid = pid_m.group(1) if pid_m else ""
            return PriceData(
                platform_id="",
                platform_slug="flipkart",
                price=price,
                original_price=mrp if mrp and mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp and mrp > price else 0.0,
                is_available=True,
                delivery_time_minutes=10,
                platform_product_id=pid or None,
                platform_product_url=f"{FLIPKART_BASE}/p/{pid}" if pid else FLIPKART_BASE,
                platform_image_url=None,
                source="scrape",
            )

    return None


class FlipkartScraper(BaseScraper):
    platform_slug = "flipkart"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            result = await self._scrape_playwright(query)
            if result:
                return result
        except Exception as exc:
            log.warning("flipkart_scrape_error", query=query, error=str(exc))

        return None

    async def _scrape_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

        captured_html: list[str] = []
        captured_json: list[dict] = []

        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="flipkart",
                viewport={"width": 1366, "height": 768},
                user_agent=(
                    "Mozilla/5.0 (X11; Linux x86_64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            )
            try:
                page = await context.new_page()

                # Intercept Flipkart's internal API responses
                async def on_response(response):
                    url = response.url
                    if "flipkart.com" not in url:
                        return
                    if response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" in ct and any(kw in url for kw in [
                        "search", "product", "listing", "api/3",
                    ]):
                        try:
                            data = await response.json()
                            if isinstance(data, dict):
                                captured_json.append(data)
                        except Exception:
                            pass

                page.on("response", on_response)

                # Step 1: Visit Flipkart homepage to establish session
                await page.goto(FLIPKART_BASE, wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(1)

                # Close login popup if present
                try:
                    close_btn = page.locator('button._2KpZ6l._2doB4z')
                    if await close_btn.count() > 0:
                        await close_btn.first.click()
                        await asyncio.sleep(0.5)
                except Exception:
                    pass

                # Step 2: Navigate to search
                search_url = (
                    f"{FLIPKART_BASE}/search?q={quote_plus(query)}"
                    f"&otracker=search&marketplace=FLIPKART"
                )
                await page.goto(search_url, wait_until="networkidle", timeout=35_000)
                await asyncio.sleep(3)

                # Step 3: Get page HTML
                html = await page.content()
                captured_html.append(html)

                # Wait for React hydration — wait for [data-id] cards to appear
                try:
                    await page.wait_for_selector('[data-id]', timeout=8000)
                except Exception:
                    pass
                await asyncio.sleep(2)

                # Step 4: DOM extraction via JavaScript
                # Confirmed structure (May 2026):
                #   [data-id="PID"] card → innerText: "Product Name\n4.2(38,863)\n₹157₹18916% off"
                #   The MRP and discount % are concatenated: "₹189" + "16% off" = "₹18916% off"
                #   So we must parse MRP from the HTML price elements, not innerText
                dom_result = await page.evaluate(
                    """() => {
                        const results = [];
                        const cards = document.querySelectorAll('[data-id]');
                        cards.forEach(function(card, i) {
                            if (i >= 8) return;
                            try {
                                const pid = card.getAttribute('data-id') || '';

                                const priceEls = card.querySelectorAll('[class*="price"], [class*="Price"]');
                                let price = 0, mrp = 0;

                                // Try to get price from dedicated price elements first
                                // Strike-through = MRP, normal = selling price
                                priceEls.forEach(function(el) {
                                    const txt = el.textContent.replace(/[^0-9]/g, '');
                                    const val = parseInt(txt) || 0;
                                    if (val < 10 || val > 200000) return;
                                    const style = window.getComputedStyle(el);
                                    const td = style.textDecoration || '';
                                    if (td.indexOf('line-through') !== -1) {
                                        if (!mrp) mrp = val;
                                    } else {
                                        if (!price) price = val;
                                    }
                                });

                                // Fallback: parse from innerText using rupee symbol
                                if (!price) {
                                    const text = card.innerText || '';
                                    const matches = [];
                                    // Match rupee sign followed by digits/commas not followed by digits+%
                                    const re = /\u20b9([0-9,]+)(?![0-9]*%)/g;
                                    let m;
                                    while ((m = re.exec(text)) !== null) {
                                        const v = parseInt(m[1].replace(/,/g, '')) || 0;
                                        if (v > 10 && v < 200000) matches.push(v);
                                    }
                                    if (matches.length > 0) price = matches[0];
                                    if (matches.length > 1 && matches[1] >= price) mrp = matches[1];
                                }

                                if (!price) return;
                                if (!mrp || mrp < price) mrp = price;

                                // Title: first non-empty line of innerText
                                const lines = (card.innerText || '').split('\n');
                                const title = lines.map(function(l) { return l.trim(); }).find(function(l) { return l.length > 3; }) || '';

                                // Product URL + PID
                                const link = card.querySelector('a[href]');
                                const href = link ? link.href : '';
                                const pidMatch = href.match(/[?&]pid=([A-Z0-9]+)/);
                                const finalPid = pidMatch ? pidMatch[1] : pid;

                                // Image
                                const imgEl = card.querySelector('img');
                                const img = imgEl ? imgEl.src : '';

                                results.push({price: price, mrp: mrp, title: title, pid: finalPid, img: img, href: href});
                            } catch(e) {}
                        });
                        return results;
                    }"""
                )

                await save_cookies(context, "flipkart")
                await page.close()

                # Process DOM results first
                if dom_result and isinstance(dom_result, list) and dom_result:
                    best = dom_result[0]
                    price = float(best.get("price", 0))
                    if price > 0:
                        mrp = float(best.get("mrp") or price)
                        pid = best.get("pid", "")
                        return PriceData(
                            platform_id="",
                            platform_slug="flipkart",
                            price=price,
                            original_price=mrp if mrp > price else None,
                            discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                            is_available=True,
                            delivery_time_minutes=10,
                            platform_product_id=pid or None,
                            platform_product_url=f"{FLIPKART_BASE}/p/{pid}" if pid else FLIPKART_BASE,
                            platform_image_url=best.get("img") or None,
                            source="scrape",
                        )

            finally:
                await context.close()

        # Process captured HTML
        for html in captured_html:
            result = _extract_from_html(html, query)
            if result:
                return result

        log.info("flipkart_no_products", query=query)
        return None
