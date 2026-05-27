"""
JioMart Express scraper — Playwright-based DOM scraping.

Strategy
--------
1. Open https://www.jiomart.com/search/<query> in Chromium.
2. Wait for product cards to render.
3. Extract product data via DOM evaluation.

DOM selectors (confirmed via inspection):
  [data-product-id]  or  .product-card  or  [class*="ProductCard"]
    name:  [class*="name"], [class*="title"], h3, h4
    price: [class*="offer-price"], [class*="price"]
    image: img[src]
"""

import asyncio
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

JIOMART_BASE = "https://www.jiomart.com"


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
        from app.scrapers.playwright_pool import get_browser

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

                await page.goto(
                    f"{JIOMART_BASE}/search/{quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)

                products = await page.evaluate(
                    """() => {
                        const out = [];
                        const selectors = [
                            '[data-product-id]',
                            '.product-card',
                            '.sku-card',
                            '[class*="ProductCard"]',
                            '[class*="product_card"]',
                            'li[class*="product"]',
                        ];
                        const cards = document.querySelectorAll(selectors.join(','));
                        cards.forEach(card => {
                            try {
                                const nameEl = card.querySelector(
                                    '[class*="name"],[class*="title"],h3,h4,p[class*="name"]'
                                );
                                const name = nameEl?.textContent?.trim();

                                const priceEl = card.querySelector(
                                    '[class*="offer-price"],[class*="final-price"],'
                                    + '[class*="price"],[class*="Price"]'
                                );
                                const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '');
                                const price = priceText ? parseFloat(priceText) : 0;

                                const mrpEl = card.querySelector(
                                    '[class*="original-price"],[class*="mrp"],[class*="strike"]'
                                );
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

                await page.close()
            finally:
                await context.close()

        if products:
            best  = products[0]
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
