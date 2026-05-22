"""Amazon Fresh / Now scraper — uses Amazon's internal search API."""
import re
import uuid
from typing import Optional

import structlog

from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

_PRICE_RE = re.compile(r"[\d,]+(?:\.\d+)?")


def _parse_price(raw: str) -> float:
    raw = raw.replace(",", "").strip()
    m = _PRICE_RE.search(raw)
    return float(m.group()) if m else 0.0


class AmazonScraper(BaseScraper):
    platform_slug = "amazon"
    BASE_URL = "https://www.amazon.in"
    SEARCH_API = "https://www.amazon.in/s"

    async def fetch_price(self, product_id: uuid.UUID, product_name: str = "") -> Optional[PriceData]:
        query = product_name or str(product_id)
        try:
            response = await self._get(
                self.SEARCH_API,
                params={
                    "k": query,
                    "rh": "p_85:10440599031",  # Amazon.in Fresh node
                    "i": "nowstore",
                    "ref": "nb_sb_noss",
                },
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-IN,en;q=0.9",
                    "Cache-Control": "no-cache",
                },
            )
            html = response.text

            # Extract first product's price from the search result HTML
            # Amazon returns inline JSON data islands we can parse cheaply
            # Pattern: "priceAmount":"199.00" or data-a-color="price" span containing ₹
            price_match = re.search(r'"priceAmount"\s*:\s*"([\d.]+)"', html)
            asin_match = re.search(r'"asin"\s*:\s*"([A-Z0-9]{10})"', html)

            if not price_match:
                # Fallback: grab the first price span
                price_match = re.search(r'class="a-price-whole"[^>]*>([\d,]+)', html)
                if not price_match:
                    return None

            price = float(price_match.group(1).replace(",", ""))
            asin = asin_match.group(1) if asin_match else ""

            # Try to extract MRP
            mrp_match = re.search(r'"priceStrikethroughAmount"\s*:\s*"([\d.]+)"', html)
            mrp = float(mrp_match.group(1)) if mrp_match else price

            return PriceData(
                platform_id="",
                platform_slug=self.platform_slug,
                price=price,
                original_price=mrp if mrp != price else None,
                discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0,
                is_available=True,
                delivery_time_minutes=120,  # Amazon Fresh: 2-hour delivery
                platform_product_id=asin,
                platform_product_url=f"{self.BASE_URL}/dp/{asin}" if asin else self.BASE_URL,
                source="scrape",
            )
        except Exception as exc:
            log.warning("amazon_scrape_error", error=str(exc))
            raise ScraperError(str(exc)) from exc
