"""
Swiggy Instamart scraper — Playwright-based with confirmed API structure.

Confirmed response structure (May 2026):
  POST /api/instamart/search/v2
  → data.cards[].card.card.gridElements.infoWithStyle.skus[]
      sku.displayName                           → product name
      sku.price.offerPrice.units                → selling price (string int)
      sku.price.mrp.units                       → MRP (string int)
      sku.imageIds[0]                           → image ID (needs CDN prefix)
      sku.variations[0].skuId                   → SKU ID
      sku.inStock                               → bool

Also handles:
  data.cards[].card.card.items[]
      item.displayName, item.variations[0].price.offerPrice.units
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

SWIGGY_BASE = "https://www.swiggy.com"
INSTAMART_IMG_CDN = "https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,h_200,w_200/"


def _parse_price_units(val) -> Optional[float]:
    """Parse price from Swiggy's units field (string int in paise or rupees)."""
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _parse_sku_v2(sku: dict) -> Optional[dict]:
    """Parse a SKU from the confirmed gridElements.infoWithStyle.skus[] structure."""
    name = sku.get("displayName") or sku.get("display_name") or sku.get("name", "")

    price_obj = sku.get("price", {})
    if isinstance(price_obj, dict):
        offer = price_obj.get("offerPrice", {})
        mrp_obj = price_obj.get("mrp", {})
        if isinstance(offer, dict):
            price = _parse_price_units(offer.get("units") or offer.get("value"))
        else:
            price = _parse_price_units(offer)
        if isinstance(mrp_obj, dict):
            mrp = _parse_price_units(mrp_obj.get("units") or mrp_obj.get("value"))
        else:
            mrp = _parse_price_units(mrp_obj)
    else:
        price = _parse_price_units(price_obj)
        mrp = price

    # Image
    image_ids = sku.get("imageIds", [])
    image = f"{INSTAMART_IMG_CDN}{image_ids[0]}" if image_ids else ""

    # SKU ID
    variations = sku.get("variations", [])
    pid = ""
    if variations and isinstance(variations[0], dict):
        pid = str(variations[0].get("skuId", "") or variations[0].get("spinId", ""))

    in_stock = sku.get("inStock", True)

    if name and price and price > 0:
        return {
            "name":      name,
            "price":     price,
            "mrp":       mrp or price,
            "unit":      sku.get("quantityDescription", "") or sku.get("unit_quantity", ""),
            "image_url": image,
            "in_stock":  in_stock,
            "pid":       pid,
        }
    return None


def _parse_item_v2(item: dict) -> Optional[dict]:
    """Parse from card.card.items[] structure."""
    name = item.get("displayName") or item.get("name", "")
    variations = item.get("variations", [])
    price = None
    mrp = None
    pid = ""
    if variations and isinstance(variations[0], dict):
        v = variations[0]
        price_obj = v.get("price", {})
        if isinstance(price_obj, dict):
            offer = price_obj.get("offerPrice", {})
            mrp_obj = price_obj.get("mrp", {})
            price = _parse_price_units(offer.get("units") if isinstance(offer, dict) else offer)
            mrp = _parse_price_units(mrp_obj.get("units") if isinstance(mrp_obj, dict) else mrp_obj)
        pid = str(v.get("skuId", ""))

    if not price:
        price_obj = item.get("price", {})
        if isinstance(price_obj, dict):
            price = _parse_price_units(
                price_obj.get("offerPrice", {}).get("units")
                or price_obj.get("mrp", {}).get("units")
            )

    image_ids = item.get("imageIds", [])
    image = f"{INSTAMART_IMG_CDN}{image_ids[0]}" if image_ids else ""

    if name and price and price > 0:
        return {
            "name":      name,
            "price":     price,
            "mrp":       mrp or price,
            "unit":      "",
            "image_url": image,
            "in_stock":  item.get("inStock", True),
            "pid":       pid,
        }
    return None


def _extract_from_cards(data: dict) -> list[dict]:
    """Walk data.cards[].card.card to find product skus/items."""
    products = []
    cards = data.get("data", {}).get("cards", [])
    for card in cards:
        card_data = card.get("card", {}).get("card", {})

        # Shape A: gridElements.infoWithStyle.skus[]
        grid = card_data.get("gridElements", {})
        if grid:
            info = grid.get("infoWithStyle", {})
            skus = info.get("skus", []) or info.get("items", [])
            for sku in skus:
                p = _parse_sku_v2(sku)
                if p:
                    products.append(p)

        # Shape B: items[]
        items = card_data.get("items", [])
        for item in items:
            p = _parse_item_v2(item)
            if p:
                products.append(p)

    return products


def _parse_response(data: dict) -> list[dict]:
    """Try all known response shapes."""
    # New confirmed shape
    products = _extract_from_cards(data)
    if products:
        return products

    # Legacy shapes
    widgets = (
        data.get("data", {}).get("widgets", [])
        or data.get("widgets", [])
        or []
    )
    for widget in widgets:
        w_skus = (
            widget.get("data", {}).get("skus", [])
            or widget.get("skus", [])
            or []
        )
        for sku in w_skus:
            p = _parse_sku_v2(sku)
            if p:
                products.append(p)

    if not products:
        skus = (
            data.get("data", {}).get("skus", [])
            or data.get("skus", [])
            or []
        )
        for sku in skus:
            p = _parse_sku_v2(sku)
            if p:
                products.append(p)

    return products


class InstamartScraper(BaseScraper):
    platform_slug = "instamart"

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
            log.warning("instamart_playwright_failed", query=query, error=str(exc))
            raise ScraperError(str(exc)) from exc

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser, apply_stealth

        captured: list[dict] = []

        async with get_browser() as browser:
            context = await browser.new_context(
                viewport={"width": 390, "height": 844},
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/17.0 Mobile/15E148 Safari/604.1"
                ),
                locale="en-IN",
                geolocation={"latitude": 12.9716, "longitude": 77.5946},
                permissions=["geolocation"],
                extra_http_headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Upgrade-Insecure-Requests": "1",
                },
            )
            try:
                page = await context.new_page()
                await apply_stealth(page)

                async def on_response(response):
                    url = response.url
                    if (
                        "swiggy.com" in url
                        and "instamart/search" in url
                        and response.status == 200
                    ):
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            try:
                                data = await response.json()
                                if isinstance(data, dict):
                                    captured.append(data)
                            except Exception:
                                pass

                page.on("response", on_response)

                # Visit instamart homepage first to establish session
                await page.goto(
                    f"{SWIGGY_BASE}/instamart",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(2)

                # Navigate to search
                await page.goto(
                    f"{SWIGGY_BASE}/instamart/search?query={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=35_000,
                )
                await asyncio.sleep(4)

                # Fallback: POST search v2 from within browser (has session cookies)
                if not any(_parse_response(d) for d in captured):
                    result = await page.evaluate(
                        """async (q) => {
                            try {
                                const r = await fetch(
                                    '/api/instamart/search/v2?offset=0&ageConsent=false'
                                    + '&voiceSearchTrackingId=&storeId=&primaryStoreId=&secondaryStoreId=',
                                    {
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        body: JSON.stringify({
                                            facets: [],
                                            sortAttribute: '',
                                            query: q,
                                            search_results_offset: '0',
                                            page_type: 'INSTAMART_SEARCH_PAGE',
                                            is_pre_search_tag: false
                                        })
                                    }
                                );
                                if (r.ok) return await r.json();
                                return null;
                            } catch(e) { return null; }
                        }""",
                        query,
                    )
                    if result and isinstance(result, dict):
                        captured.append(result)

                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _parse_response(data)
            if products:
                best  = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                return PriceData(
                    platform_id="",
                    platform_slug="instamart",
                    price=price,
                    original_price=mrp if mrp > price else None,
                    discount_percent=round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    is_available=best["in_stock"],
                    delivery_time_minutes=15,
                    platform_product_id=best["pid"] or None,
                    platform_product_url=None,
                    platform_image_url=best["image_url"] or None,
                    source="scrape",
                )

        log.info("instamart_no_result", query=query)
        return None
