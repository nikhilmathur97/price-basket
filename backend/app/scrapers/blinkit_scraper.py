"""
Blinkit scraper — direct REST API (primary) + Apify actor (optional fallback).

Primary: Blinkit's internal JSON search API (no token needed, location-aware).
Fallback: Apify actor if APIFY_API_TOKEN is set in config.

Config (.env / Render):
  BLINKIT_LAT   latitude  (default: 28.6139  Delhi NCR)
  BLINKIT_LON   longitude (default: 77.2090  Delhi NCR)
  APIFY_API_TOKEN  optional; enables fallback to Apify actor
"""

import asyncio
import uuid
from typing import Optional
from urllib.parse import quote_plus

import structlog

from app.config import settings
from app.scrapers.base_scraper import BaseScraper, ScraperError
from app.services.price_engine import PriceData

log = structlog.get_logger(__name__)

BLINKIT_BASE  = "https://blinkit.com"
SEARCH_V6     = "https://blinkit.com/v6/listing/products"
SEARCH_V2     = "https://blinkit.com/v2/listing/products"
IMAGE_CDN     = "https://cdn.blinkit.com/rsku_image/products_main"


def _build_image_url(raw: str | None) -> str | None:
    """Turn whatever Blinkit returns for an image into a full HTTPS URL."""
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    # Strip leading slashes / 'rsku_image/products_main/' prefix duplication
    name = raw.lstrip("/")
    if name.startswith("rsku_image/products_main/"):
        return f"https://cdn.blinkit.com/{name}"
    return f"{IMAGE_CDN}/{name}"


def _best_product(items: list[dict]) -> dict | None:
    """Pick the best available item from a raw product list."""
    if not items:
        return None
    in_stock = [i for i in items if i.get("in_stock") or i.get("available") == 1]
    pool = in_stock or items
    # Prefer items with a price > 0
    with_price = [i for i in pool if float(i.get("price") or 0) > 0]
    return (with_price or pool)[0]


class BlinkitScraper(BaseScraper):
    platform_slug = "blinkit"

    # ── Public interface ──────────────────────────────────────────────────────

    async def fetch_price(
        self,
        product_id: uuid.UUID,
        product_name: str = "",
    ) -> Optional[PriceData]:
        query = product_name or str(product_id)
        if not query:
            return None

        # 1. Try v6 REST API
        try:
            result = await self._fetch_v6(query)
            if result:
                return result
        except Exception as e:
            log.debug("blinkit_v6_failed", query=query, error=str(e))

        # 2. Try v2 REST API
        try:
            result = await self._fetch_v2(query)
            if result:
                return result
        except Exception as e:
            log.debug("blinkit_v2_failed", query=query, error=str(e))

        # 3. Optional Apify fallback
        if settings.APIFY_API_TOKEN:
            try:
                return await self._fetch_apify(query)
            except Exception as e:
                log.warning("blinkit_apify_failed", query=query, error=str(e))
                raise ScraperError(str(e)) from e

        log.info("blinkit_no_result", query=query)
        return None

    # ── REST v6 ───────────────────────────────────────────────────────────────

    async def _fetch_v6(self, query: str) -> Optional[PriceData]:
        resp = await self._get(
            SEARCH_V6,
            params={"q": query, "start": 0, "limit": 10, "search_type": 8},
            headers=self._location_headers(query),
        )
        data = resp.json()

        # Response shape 1: {"objects": [{"type": "PRODUCT", "data": {...}}, ...]}
        objects = data.get("objects") or []
        products = [
            o["data"]
            for o in objects
            if isinstance(o, dict) and o.get("type") == "PRODUCT" and "data" in o
        ]

        # Response shape 2: flat list
        if not products and isinstance(data, list):
            products = data

        # Response shape 3: nested products key
        if not products:
            products = data.get("products") or data.get("results") or []

        best = _best_product(products)
        return self._map(best) if best else None

    # ── REST v2 ───────────────────────────────────────────────────────────────

    async def _fetch_v2(self, query: str) -> Optional[PriceData]:
        resp = await self._get(
            SEARCH_V2,
            params={"q": query, "start": 0, "limit": 10},
            headers=self._location_headers(query),
        )
        data = resp.json()
        objects = data.get("objects") or data.get("products") or []
        if isinstance(data, list):
            objects = data
        products = []
        for o in objects:
            if isinstance(o, dict):
                products.append(o.get("data") or o)
        products = [p for p in products if p and float(p.get("price") or 0) > 0]
        best = _best_product(products)
        return self._map(best) if best else None

    # ── Apify fallback ────────────────────────────────────────────────────────

    async def _fetch_apify(self, query: str) -> Optional[PriceData]:
        loop = asyncio.get_event_loop()
        items: list[dict] = await loop.run_in_executor(None, self._run_actor, query)
        best = _best_product(items)
        return self._map(best, source="apify") if best else None

    def _run_actor(self, query: str) -> list[dict]:
        from apify_client import ApifyClient  # lazy import
        client = ApifyClient(settings.APIFY_API_TOKEN)
        run = client.actor("jocular_quisling/blinkit-product-scraper").call(
            run_input={
                "queries": [query],
                "lat": settings.BLINKIT_LAT,
                "lon": settings.BLINKIT_LON,
                "max_pages": 1,
                "use_proxy": True,
            }
        )
        dataset_id = run.get("defaultDatasetId", "")
        return list(client.dataset(dataset_id).iterate_items()) if dataset_id else []

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _location_headers(self, query: str) -> dict:
        lat = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
        lon = str(getattr(settings, "BLINKIT_LON", "77.2090"))
        return {
            "app_client":         "consumer_web",
            "lat":                lat,
            "lon":                lon,
            "rn_bundle_version":  "1000033",
            "Accept":             "application/json, text/plain, */*",
            "Origin":             BLINKIT_BASE,
            "Referer":            f"{BLINKIT_BASE}/search?q={quote_plus(query)}",
            "web-version":        "2024120401",
        }

    @staticmethod
    def _map(item: dict, source: str = "scrape") -> PriceData:
        price = float(item.get("price") or 0)
        mrp   = float(item.get("mrp")   or price)
        if price <= 0:
            price = mrp

        in_stock = bool(
            item.get("in_stock") or item.get("available") or item.get("is_in_stock")
        )

        discount = round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0

        # Image URL — handle both list-of-dicts and list-of-strings
        raw_imgs = item.get("images") or []
        if raw_imgs:
            first = raw_imgs[0]
            raw_img = first.get("name") or first.get("url") or (first if isinstance(first, str) else None)
        else:
            raw_img = item.get("image_url") or item.get("thumbnail")

        image_url = _build_image_url(raw_img)

        pid   = str(item.get("id") or item.get("product_id") or item.get("variant_id") or "")
        slug  = item.get("slug") or pid
        p_url = f"{BLINKIT_BASE}/prn/{slug}" if slug else None

        return PriceData(
            platform_id="",
            platform_slug="blinkit",
            price=price,
            original_price=mrp if mrp > price else None,
            discount_percent=discount,
            is_available=in_stock,
            delivery_time_minutes=10,
            platform_product_id=pid or None,
            platform_product_url=p_url,
            platform_image_url=image_url,
            source=source,
        )
