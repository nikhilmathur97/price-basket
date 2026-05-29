"""
Amazon Fresh / Now scraper.
Uses Amazon's search page + multiple regex patterns to extract price.

Strategy
--------
1. GET https://www.amazon.in/s?k=<query>&i=nowstore
2. Find the first search result block (data-component-type="s-search-result")
3. Extract price from a-price-whole span (handles nested decimal span)
4. Extract ASIN and title from the same block

Confirmed working patterns (May 2026):
  Price: <span class="a-price-whole">269<span class="a-price-decimal">.</span></span>
  ASIN:  data-asin="B0936V88H6"
  Title: <span class="a-size-base-plus ...">Product Name</span>
         or <span class="a-size-medium ...">Product Name</span>
"""
import re
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

# Matches the price-whole span, ignoring the nested decimal span inside it
# e.g. <span class="a-price-whole">269<span ...>.</span></span>
_PRICE_WHOLE_RE = re.compile(
    r'class="a-price-whole">([\d,]+)(?:<span[^>]*>[^<]*</span>)?</span>'
)
# MRP is in a strikethrough price block
_MRP_RE = re.compile(
    r'class="a-price a-text-price"[^>]*>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?'
    r'class="a-price-whole">([\d,]+)',
    re.DOTALL,
)
_ASIN_RE = re.compile(r'data-asin="([A-Z0-9]{10})"')
_TITLE_RE = re.compile(
    r'class="a-size-(?:base-plus|medium)[^"]*"[^>]*>\s*([^<]{5,120}?)\s*</span>'
)


def _parse_price(text: str) -> Optional[float]:
    try:
        return float(text.replace(",", ""))
    except (ValueError, TypeError):
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
                    "i": "nowstore",   # Amazon Fresh / Now store
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

            # Find the first real search result block
            result_blocks = list(re.finditer(
                r'data-component-type="s-search-result"[^>]*data-asin="([A-Z0-9]{10})"',
                html,
            ))
            if not result_blocks:
                # Fallback: scan whole page
                return self._parse_whole_page(html)

            for m in result_blocks[:3]:
                asin = m.group(1)
                pos = m.start()
                chunk = html[pos: pos + 5000]

                price_m = _PRICE_WHOLE_RE.search(chunk)
                if not price_m:
                    continue

                price = _parse_price(price_m.group(1))
                if not price or price <= 0:
                    continue

                mrp_m = _MRP_RE.search(chunk)
                mrp = _parse_price(mrp_m.group(1)) if mrp_m else price

                title_m = _TITLE_RE.search(chunk)
                title = title_m.group(1).strip() if title_m else ""

                return PriceData(
                    platform_id="",
                    platform_slug=self.platform_slug,
                    price=price,
                    original_price=mrp if mrp and mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp and mrp > price else 0.0,
                    is_available=True,
                    delivery_time_minutes=120,
                    platform_product_id=asin,
                    platform_product_url=f"{self.BASE_URL}/dp/{asin}",
                    platform_image_url=None,
                    source="scrape",
                )

            return None

        except Exception as exc:
            log.warning("amazon_scrape_error", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    def _parse_whole_page(self, html: str) -> Optional[PriceData]:
        """Fallback: scan entire page for first price + ASIN."""
        price_m = _PRICE_WHOLE_RE.search(html)
        asin_m = _ASIN_RE.search(html)
        if not price_m:
            return None
        price = _parse_price(price_m.group(1))
        if not price or price <= 0:
            return None
        asin = asin_m.group(1) if asin_m else ""
        return PriceData(
            platform_id="",
            platform_slug=self.platform_slug,
            price=price,
            original_price=None,
            discount_percent=0.0,
            is_available=True,
            delivery_time_minutes=120,
            platform_product_id=asin,
            platform_product_url=f"{self.BASE_URL}/dp/{asin}" if asin else self.BASE_URL,
            platform_image_url=None,
            source="scrape",
        )
