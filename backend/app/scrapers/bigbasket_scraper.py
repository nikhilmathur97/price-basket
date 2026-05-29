"""
BigBasket BB Now scraper — Playwright-based with Cloudflare bypass.

Strategy
--------
1. Open https://www.bigbasket.com/ps/?q=<query> in Chromium with stealth JS.
2. Intercept ALL JSON responses from bigbasket.com that contain product data.
3. Parse multiple response shapes:
   a. tab_info-based  (legacy)
   b. products[].product  (newer shape)
   c. prod_info[].prod  (another variant)

Cloudflare bypass: inject stealth JS + use realistic Chrome headers +
  set extra HTTP headers to mimic a real browser session.
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

_CHROME_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
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


def _parse_tab_info(data: dict) -> list[dict]:
    products = []
    tab_info = data.get("tab_info", [])
    for tab in tab_info:
        if not isinstance(tab, dict):
            continue
        for v in tab.values():
            if not (isinstance(v, list) and v and isinstance(v[0], dict)):
                continue
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


def _parse_products_list(data: dict) -> list[dict]:
    products = []
    for item in data.get("products", []):
        p = item.get("product", item)
        name  = p.get("desc", "") or p.get("name", "")
        price = _parse_price(p.get("sp") or p.get("selling_price"))
        mrp   = _parse_price(p.get("mrp"))
        img   = p.get("img", {})
        image = img.get("s", "") if isinstance(img, dict) else (img if isinstance(img, str) else "")
        pid   = str(p.get("id") or p.get("product_id") or "")
        if name and price and price > 0:
            products.append({
                "name":      name,
                "price":     price,
                "mrp":       mrp or price,
                "unit":      p.get("w", "") or p.get("unit", ""),
                "image_url": image,
                "in_stock":  p.get("oos", 0) == 0,
                "pid":       pid,
                "url":       f"{BB_BASE}/pd/{p.get('slug', pid)}/" if pid else None,
            })
    return products


def _parse_prod_info(data: dict) -> list[dict]:
    products = []
    for item in data.get("prod_info", []):
        p = item.get("prod", item)
        name  = p.get("desc", "") or p.get("name", "")
        price = _parse_price(p.get("sp") or p.get("selling_price"))
        mrp   = _parse_price(p.get("mrp"))
        img   = p.get("img", {})
        image = img.get("s", "") if isinstance(img, dict) else ""
        pid   = str(p.get("id") or "")
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


def _extract_products(data: dict) -> list[dict]:
    for parser in (_parse_tab_info, _parse_products_list, _parse_prod_info):
        result = parser(data)
        if result:
            return result
    return []


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
        from app.scrapers.playwright_pool import get_browser, apply_stealth

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
                extra_http_headers=_CHROME_HEADERS,
            )
            try:
                page = await context.new_page()
                # Apply stealth before any navigation
                await apply_stealth(page)

                # Intercept JSON responses
                async def on_response(response):
                    url = response.url
                    if "bigbasket.com" not in url:
                        return
                    if response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" not in ct:
                        return
                    if any(kw in url for kw in ["get-products", "search", "listing", "ps/"]):
                        try:
                            data = await response.json()
                            if data and isinstance(data, dict):
                                captured.append(data)
                        except Exception:
                            pass

                page.on("response", on_response)

                # Step 1: Visit homepage to establish session
                await page.goto(BB_BASE, wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(2)

                # Check if we got past Cloudflare
                title = await page.title()
                if "access denied" in title.lower() or "cloudflare" in title.lower():
                    log.warning("bigbasket_cloudflare_block", title=title)
                    # Try waiting longer for CF challenge to resolve
                    await asyncio.sleep(5)

                # Step 2: Navigate to search
                await page.goto(
                    f"{BB_BASE}/ps/?q={quote_plus(query)}&nc=as",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)

                # Fallback: call API from within browser (has session cookies)
                if not any(_extract_products(d) for d in captured):
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
                    if result and isinstance(result, dict):
                        captured.append(result)

                # Fallback: DOM scraping
                if not any(_extract_products(d) for d in captured):
                    dom_products = await page.evaluate(
                        """() => {
                            const out = [];
                            const cards = document.querySelectorAll(
                                '[class*="SKUDeck"], [class*="product-card"], [class*="ProductCard"], '
                                + 'li[class*="product"], [data-product-id]'
                            );
                            cards.forEach(card => {
                                try {
                                    const nameEl = card.querySelector(
                                        '[class*="Description"], [class*="name"], [class*="title"], h3, h4'
                                    );
                                    const name = nameEl?.textContent?.trim();
                                    const priceEl = card.querySelector(
                                        '[class*="offer-price"], [class*="selling-price"], '
                                        + '[class*="discounted"], [class*="Price"]'
                                    );
                                    const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '');
                                    const price = priceText ? parseFloat(priceText) : 0;
                                    const mrpEl = card.querySelector('[class*="mrp"], [class*="strike"]');
                                    const mrpText = mrpEl?.textContent?.replace(/[^0-9.]/g, '');
                                    const mrp = mrpText ? parseFloat(mrpText) : price;
                                    const img = card.querySelector('img')?.src || '';
                                    const pid = card.getAttribute('data-product-id') || '';
                                    if (name && price > 0) {
                                        out.push({name, price, mrp: mrp || price, image_url: img, pid});
                                    }
                                } catch(e) {}
                            });
                            return out;
                        }"""
                    )
                    if dom_products:
                        captured.append({"products": [{"product": p} for p in dom_products]})

                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _extract_products(data)
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
