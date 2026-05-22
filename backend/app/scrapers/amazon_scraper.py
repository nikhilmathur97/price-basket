"""
Amazon Fresh / Now scraper.
Uses Amazon's search page + multiple regex patterns to extract price.
Falls back gracefully — Amazon's HTML structure changes frequently.
"""
import re
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

# Ordered by reliability: JSON data islands first, then HTML fallbacks
_PRICE_PATTERNS = [
    re.compile(r'"priceAmount"\s*:\s*"([\d.]+)"'),
    re.compile(r'"buyingPrice"\s*:\s*"([\d.]+)"'),
    re.compile(r'"displayPrice"\s*:\s*"₹\s*([\d,]+)"'),
    re.compile(r'class="a-price-whole"[^>]*>\s*([\d,]+)'),
    re.compile(r'"price"\s*:\s*"₹\s*([\d,]+(?:\.\d+)?)"'),
]
_MRP_PATTERNS = [
    re.compile(r'"priceStrikethroughAmount"\s*:\s*"([\d.]+)"'),
    re.compile(r'"listPrice"\s*:\s*"₹\s*([\d,]+)"'),
    re.compile(r'class="a-price a-text-price"[^>]*>.*?₹\s*([\d,]+)', re.DOTALL),
]
_ASIN_RE = re.compile(r'"asin"\s*:\s*"([A-Z0-9]{10})"')
_TITLE_RE = re.compile(r'"title"\s*:\s*"([^"]{5,120})"')


def _extract(patterns: list, html: str) -> Optional[float]:
    for pat in patterns:
        m = pat.search(html)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except (ValueError, IndexError):
                continue
    return None


class AmazonScraper(BaseScraper):
    platform_slug = "amazon"
    BASE_URL = "https://www.amazon.in"
    SEARCH_URL = "https://www.amazon.in/s"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_URL,
                params={
                    "k": query,
                    "i": "nowstore",          # Amazon Fresh / Now store
                    "ref": "nb_sb_noss",
                },
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-IN,en;q=0.9",
                    "Cache-Control": "no-cache",
                    "Upgrade-Insecure-Requests": "1",
                },
            )
            html = response.text

            price = _extract(_PRICE_PATTERNS, html)
            if price is None or price <= 0:
                return None

            mrp = _extract(_MRP_PATTERNS, html) or price
            asin = _ASIN_RE.search(html)
            asin_str = asin.group(1) if asin else ""

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp > price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=True,
                delivery_time_minutes=120,
                platform_product_id=asin_str,
                platform_product_url=f"{self.BASE_URL}/dp/{asin_str}" if asin_str else self.BASE_URL,
                source="scrape",
            )
        except Exception as exc:
            log.warning("amazon_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc
