"""
Amazon Fresh / Now scraper — Playwright-based with full stealth bypass.

Strategy
--------
1. Open https://www.amazon.in/s?k=<query>&i=nowstore in Chromium with stealth JS.
2. Intercept JSON API responses (Fresh/Now store product data).
3. Parse DOM for price spans if no JSON captured.
4. Multiple regex patterns for different Amazon page layouts.
5. Persist cookies between runs to avoid repeated bot challenges.

Confirmed working patterns (May 2026):
  Price: <span class="a-price-whole">269<span class="a-price-decimal">.</span></span>
  ASIN:  data-asin="B0936V88H6"
  Title: <span class="a-size-base-plus ...">Product Name</span>

If live scraping fails, returns None (no price shown for this platform).
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

AMAZON_BASE = "https://www.amazon.in"

# Matches the price-whole span, ignoring the nested decimal span inside it
_PRICE_WHOLE_RE = re.compile(
    r'class="a-price-whole">([\d,]+)(?:<span[^>]*>[^<]*</span>)?</span>'
)
_MRP_RE = re.compile(
    r'class="a-price a-text-price"[^>]*>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?'
    r'class="a-price-whole">([\d,]+)',
    re.DOTALL,
)
_ASIN_RE = re.compile(r'data-asin="([A-Z0-9]{10})"')
_TITLE_RE = re.compile(
    r'class="a-size-(?:base-plus|medium)[^"]*"[^>]*>\s*([^<]{5,120}?)\s*</span>'
)
_PRICE_SYMBOL_RE = re.compile(r'₹\s*([\d,]+(?:\.\d{1,2})?)')


def _parse_price(text: str) -> Optional[float]:
    try:
        return float(str(text).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _extract_from_html(html: str, query: str) -> Optional[PriceData]:
    """Parse price from Amazon HTML using multiple strategies."""
    # Detect CAPTCHA / robot check
    if "robot" in html.lower() or "captcha" in html.lower() or len(html) < 3000:
        log.warning("amazon_bot_detected", query=query, size=len(html))
        return None

    # Strategy A: search result blocks
    result_blocks = list(re.finditer(
        r'data-component-type="s-search-result"[^>]*data-asin="([A-Z0-9]{10})"',
        html,
    ))
    if result_blocks:
        for m in result_blocks[:5]:
            asin = m.group(1)
            pos = m.start()
            chunk = html[pos: pos + 6000]

            price_m = _PRICE_WHOLE_RE.search(chunk)
            if price_m:
                price = _parse_price(price_m.group(1))
            else:
                price_m2 = _PRICE_SYMBOL_RE.search(chunk)
                price = _parse_price(price_m2.group(1)) if price_m2 else None

            if not price or price <= 0:
                continue

            mrp_m = _MRP_RE.search(chunk)
            mrp = _parse_price(mrp_m.group(1)) if mrp_m else price
            title_m = _TITLE_RE.search(chunk)
            title = title_m.group(1).strip() if title_m else ""

            return PriceData(
                platform_id="",
                platform_slug="amazon",
                price=price,
                original_price=mrp if mrp and mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp and mrp > price else 0.0,
                is_available=True,
                delivery_time_minutes=120,
                platform_product_id=asin,
                platform_product_url=f"{AMAZON_BASE}/dp/{asin}",
                platform_image_url=None,
                source="scrape",
            )

    # Strategy B: whole-page scan
    price_m = _PRICE_WHOLE_RE.search(html)
    if not price_m:
        price_m2 = _PRICE_SYMBOL_RE.search(html)
        if not price_m2:
            return None
        price = _parse_price(price_m2.group(1))
    else:
        price = _parse_price(price_m.group(1))

    if not price or price <= 0:
        return None

    asin_m = _ASIN_RE.search(html)
    asin = asin_m.group(1) if asin_m else ""
    return PriceData(
        platform_id="",
        platform_slug="amazon",
        price=price,
        original_price=None,
        discount_percent=0.0,
        is_available=True,
        delivery_time_minutes=120,
        platform_product_id=asin,
        platform_product_url=f"{AMAZON_BASE}/dp/{asin}" if asin else AMAZON_BASE,
        platform_image_url=None,
        source="scrape",
    )


class AmazonScraper(BaseScraper):
    platform_slug = "amazon"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            result = await self._scrape_playwright(query)
            if result:
                return result
        except Exception as exc:
            log.warning("amazon_scrape_error", query=query, error=str(exc))

        return None

    async def _scrape_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

        captured_html: list[str] = []
        captured_json: list[dict] = []

        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="amazon",
                viewport={"width": 1366, "height": 768},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            )
            try:
                page = await context.new_page()

                # Intercept JSON responses (Amazon Fresh API)
                async def on_response(response):
                    url = response.url
                    if "amazon.in" not in url:
                        return
                    if response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" in ct and any(kw in url for kw in [
                        "fresh", "now", "search", "s?k=", "api/search",
                    ]):
                        try:
                            data = await response.json()
                            if isinstance(data, dict):
                                captured_json.append(data)
                        except Exception:
                            pass

                page.on("response", on_response)

                # Step 1: Visit Amazon homepage to establish session
                await page.goto(AMAZON_BASE, wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(1)

                # Step 2: Set delivery location to Mumbai (400001) via cookie
                await page.evaluate("""() => {
                    document.cookie = 'i18n-prefs=INR; path=/; domain=.amazon.in';
                    document.cookie = 'lc-acbin=en_IN; path=/; domain=.amazon.in';
                }""")

                # Step 3: Navigate to Fresh/Now search
                search_url = (
                    f"{AMAZON_BASE}/s?k={quote_plus(query)}"
                    f"&i=nowstore&ref=nb_sb_noss_1"
                )
                await page.goto(search_url, wait_until="networkidle", timeout=35_000)
                await asyncio.sleep(3)

                # Step 4: Get page HTML
                html = await page.content()
                captured_html.append(html)

                # Step 5: If CAPTCHA detected, try scrolling + waiting
                if "captcha" in html.lower() or "robot" in html.lower():
                    log.warning("amazon_captcha_on_load", query=query)
                    await page.mouse.move(400, 300)
                    await asyncio.sleep(2)
                    await page.mouse.wheel(0, 500)
                    await asyncio.sleep(2)
                    html = await page.content()
                    captured_html[0] = html

                # Step 6: Try DOM extraction via JavaScript
                dom_result = await page.evaluate(
                    """() => {
                        const results = [];
                        const cards = document.querySelectorAll(
                            '[data-component-type="s-search-result"]'
                        );
                        cards.forEach(card => {
                            try {
                                const asin = card.getAttribute('data-asin') || '';
                                const priceWhole = card.querySelector('.a-price-whole');
                                let price = 0;
                                if (priceWhole) {
                                    const txt = priceWhole.textContent.replace(/[^0-9]/g, '');
                                    price = parseInt(txt) || 0;
                                }
                                if (!price) {
                                     // Try rupee symbol
                                     const allText = card.textContent;
                                     const m = allText.match(/\u20b9\s*([0-9,]+)/);
                                     if (m) price = parseInt(m[1].replace(/,/g, '')) || 0;
                                 }
                                 const titleEl = card.querySelector(
                                     'h2 a span, .a-size-base-plus, .a-size-medium'
                                 );
                                 const title = titleEl ? titleEl.textContent.trim() : '';
                                 const imgEl = card.querySelector('img.s-image');
                                 const img = imgEl ? imgEl.src : '';
                                 // Filter out CAPTCHA page prices (< 50) and unrealistic values
                                 if (asin && price > 50 && price < 500000) {
                                     results.push({asin, price, title, img});
                                 }
                            } catch(e) {}
                        });
                        return results;
                    }"""
                )

                await save_cookies(context, "amazon")
                await page.close()

                # Process DOM results first (most reliable)
                if dom_result and isinstance(dom_result, list) and dom_result:
                    best = dom_result[0]
                    price = float(best.get("price", 0))
                    if price > 0:
                        asin = best.get("asin", "")
                        return PriceData(
                            platform_id="",
                            platform_slug="amazon",
                            price=price,
                            original_price=None,
                            discount_percent=0.0,
                            is_available=True,
                            delivery_time_minutes=120,
                            platform_product_id=asin or None,
                            platform_product_url=f"{AMAZON_BASE}/dp/{asin}" if asin else AMAZON_BASE,
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

        log.info("amazon_no_result", query=query)
        return None
