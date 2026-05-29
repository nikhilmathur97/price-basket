"""
Flipkart scraper — parses the embedded script-tag JSON from Flipkart's search page.

Strategy
--------
1. GET https://www.flipkart.com/search?q=<query>
2. Find the large inline <script> that contains "finalPrice"
3. Extract title + finalPrice.value pairs via regex
4. Skip the first result if it is an ad/access-denied artefact

Response structure (confirmed via HTML inspection):
  Inline script JSON blob:
    "title": "<product name>"
    "finalPrice": {"name": "Total", "priceType": "TOTAL", "value": <int>}
    "mrpPrice":   {"name": "MRP",   "priceType": "MRP",   "value": <int>}
"""
import re
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

# Matches: "title":"<name>" ... "finalPrice":{"...","value":<int>}
# We use a non-greedy scan so we get the closest finalPrice to each title
_PRODUCT_RE = re.compile(
    r'"title"\s*:\s*"([^"]{5,120})"\s*(?:(?!"title").)*?"finalPrice"\s*:\s*\{[^}]*"value"\s*:\s*(\d+)',
    re.DOTALL,
)
_MRP_RE = re.compile(
    r'"mrpPrice"\s*:\s*\{[^}]*"value"\s*:\s*(\d+)',
)
_ASIN_RE = re.compile(r'/p/(itm[A-Za-z0-9]+)')


class FlipkartScraper(BaseScraper):
    platform_slug = "flipkart"
    BASE_URL = "https://www.flipkart.com"
    SEARCH_URL = "https://www.flipkart.com/search"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_URL,
                params={"q": query, "otracker": "search", "marketplace": "FLIPKART"},
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-IN,en;q=0.9",
                    "Referer": "https://www.flipkart.com/",
                },
            )
            html = response.text

            # Find the script tag that contains product price data
            scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
            price_script = next((s for s in scripts if "finalPrice" in s), None)
            if not price_script:
                log.info("flipkart_no_price_script", query=query)
                return None

            # Extract all (title, price) pairs
            matches = _PRODUCT_RE.findall(price_script)
            if not matches:
                log.info("flipkart_no_products", query=query)
                return None

            # Skip "Access Denied" / ad artefacts; take first real product
            real = [(t, int(p)) for t, p in matches if "access denied" not in t.lower() and int(p) > 0]
            if not real:
                return None

            title, price = real[0]

            # Find MRP in the same script (first occurrence after the product block)
            mrp_m = _MRP_RE.search(price_script)
            mrp = int(mrp_m.group(1)) if mrp_m else price

            # Try to extract a product URL slug
            pid_m = _ASIN_RE.search(html)
            pid = pid_m.group(1) if pid_m else ""

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=float(price),
                original_price=float(mrp) if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                is_available=True,
                delivery_time_minutes=10,
                platform_product_id=pid or None,
                platform_product_url=f"{self.BASE_URL}/p/{pid}" if pid else self.BASE_URL,
                platform_image_url=None,
                source="scrape",
            )
        except Exception as exc:
            log.warning("flipkart_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc
