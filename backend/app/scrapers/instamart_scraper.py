"""
Swiggy Instamart scraper — Playwright-based with confirmed API structure.

Confirmed response structure (May 2026):
  GET /api/instamart/search/v2?offset=0&ageConsent=false&storeId=<id>&...
  → data.cards[].card.card.gridElements.infoWithStyle.skus[]
      sku.displayName                                    → product name
      sku.variations[0].price.offerPrice.units           → selling price (string int, rupees)
      sku.variations[0].price.mrp.units                  → MRP (string int, rupees)
      sku.variations[0].imageIds[0]                      → image ID (needs CDN prefix)
      sku.variations[0].skuId                            → SKU ID
      sku.inStock                                        → bool

NOTE: Price is in sku.variations[0].price, NOT in sku.price directly.

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

SWIGGY_BASE = "https://www.swiggy.com"
INSTAMART_IMG_CDN = "https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,h_200,w_200/"


def _parse_price_units(val) -> Optional[float]:
    """Parse price from Swiggy's units field (string int in rupees)."""
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _parse_variation(variation: dict) -> Optional[dict]:
    """
    Parse a single variation from sku.variations[].
    Confirmed 2026 structure:
      variation.price.offerPrice.units  → selling price
      variation.price.mrp.units         → MRP
      variation.imageIds[0]             → image
      variation.skuId                   → SKU ID
      variation.quantityDescription     → unit (e.g. "500 g")
    """
    price_obj = variation.get("price", {})
    if not isinstance(price_obj, dict):
        return None

    offer = price_obj.get("offerPrice", {})
    mrp_obj = price_obj.get("mrp", {})

    price = _parse_price_units(
        offer.get("units") if isinstance(offer, dict) else offer
    )
    mrp = _parse_price_units(
        mrp_obj.get("units") if isinstance(mrp_obj, dict) else mrp_obj
    )

    image_ids = variation.get("imageIds", [])
    image = f"{INSTAMART_IMG_CDN}{image_ids[0]}" if image_ids else ""

    pid = str(variation.get("skuId", "") or variation.get("spinId", ""))
    unit = variation.get("quantityDescription", "") or variation.get("unit_quantity", "")

    return {
        "price": price,
        "mrp": mrp,
        "image": image,
        "pid": pid,
        "unit": unit,
        "in_stock": variation.get("inventory", {}).get("inStock", True)
                    if isinstance(variation.get("inventory"), dict)
                    else True,
    }


def _parse_sku(sku: dict) -> Optional[dict]:
    """
    Parse a SKU from gridElements.infoWithStyle.skus[].
    Price is in sku.variations[0].price (NOT sku.price).
    """
    name = sku.get("displayName") or sku.get("display_name") or sku.get("name", "")
    in_stock = sku.get("inStock", True)

    # Walk variations to find price
    variations = sku.get("variations", [])
    price = None
    mrp = None
    image = ""
    pid = ""
    unit = ""

    for v in variations:
        if not isinstance(v, dict):
            continue
        parsed = _parse_variation(v)
        if parsed and parsed.get("price") and parsed["price"] > 0:
            price = parsed["price"]
            mrp = parsed["mrp"]
            image = parsed["image"]
            pid = parsed["pid"]
            unit = parsed["unit"]
            in_stock = parsed["in_stock"]
            break

    # Fallback: sku.price (older shape)
    if not price:
        price_obj = sku.get("price", {})
        if isinstance(price_obj, dict):
            offer = price_obj.get("offerPrice", {})
            mrp_obj = price_obj.get("mrp", {})
            price = _parse_price_units(offer.get("units") if isinstance(offer, dict) else offer)
            mrp = _parse_price_units(mrp_obj.get("units") if isinstance(mrp_obj, dict) else mrp_obj)
        else:
            price = _parse_price_units(price_obj)

    if not name or not price or price <= 0:
        return None

    return {
        "name":      name,
        "price":     price,
        "mrp":       mrp or price,
        "unit":      unit,
        "image_url": image,
        "in_stock":  in_stock,
        "pid":       pid,
    }


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
                p = _parse_sku(sku)
                if p:
                    products.append(p)

        # Shape B: items[] (InlineBanner and similar widgets)
        items = card_data.get("items", [])
        for item in items:
            if not isinstance(item, dict):
                continue
            p = _parse_sku(item)
            if p:
                products.append(p)

    return products


def _parse_response(data: dict) -> list[dict]:
    """Try all known response shapes."""
    # New confirmed shape (2026)
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
            p = _parse_sku(sku)
            if p:
                products.append(p)

    if not products:
        skus = (
            data.get("data", {}).get("skus", [])
            or data.get("skus", [])
            or []
        )
        for sku in skus:
            p = _parse_sku(sku)
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
            result = await self._fetch_playwright(query)
            if result:
                return result
        except Exception as exc:
            log.warning("instamart_playwright_failed", query=query, error=str(exc))

        return None

    async def _fetch_playwright(self, query: str) -> Optional[PriceData]:
        from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

        captured: list[dict] = []

        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="instamart",
                viewport={"width": 390, "height": 844},
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/17.0 Mobile/15E148 Safari/604.1"
                ),
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
                                    log.debug("instamart_json_captured", url=url[:80])
                            except Exception:
                                pass

                page.on("response", on_response)

                # Visit instamart homepage first to establish session + get storeId
                await page.goto(
                    f"{SWIGGY_BASE}/instamart",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(2)

                # Navigate to search — this auto-fires search/v2 with storeId from cookies
                await page.goto(
                    f"{SWIGGY_BASE}/instamart/search?query={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=35_000,
                )
                await asyncio.sleep(4)

                # Fallback: POST search v2 from within browser (has session cookies + storeId)
                if not any(_parse_response(d) for d in captured):
                    result = await page.evaluate(
                        """async (q) => {
                            try {
                                // Try to get storeId from window state or cookies
                                let storeId = '';
                                try {
                                    const state = window.__INITIAL_STATE__ || window.__REDUX_STATE__ || {};
                                    storeId = state?.instamart?.storeId || state?.storeId || '';
                                } catch(e) {}

                                const r = await fetch(
                                    '/api/instamart/search/v2?offset=0&ageConsent=false'
                                    + '&voiceSearchTrackingId=&storeId=' + storeId
                                    + '&primaryStoreId=' + storeId + '&secondaryStoreId=',
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

                await save_cookies(context, "instamart")
                await page.close()
            finally:
                await context.close()

        for data in captured:
            products = _parse_response(data)
            if products:
                best  = products[0]
                price = best["price"]
                mrp   = best["mrp"]
                log.info("instamart_scraped", query=query, price=price, mrp=mrp,
                         pid=best["pid"], name=best["name"][:40])
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
