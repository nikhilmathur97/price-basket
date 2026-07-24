"""
Universal Bulk Product Scraper
==============================
Scrapes REAL products from Blinkit, Zepto, Instamart, BigBasket, JioMart, Amazon Fresh.

HOW IT WORKS:
- Sends search queries (e.g. "Amul Milk") to each platform's live search page
- Playwright headless Chromium intercepts the real API responses
- ALL product data (name, brand, price, MRP, image, URL, unit) comes 100% from the platform
- NO fake/hardcoded product data — everything is live-scraped
- Saves real products + real prices directly to PostgreSQL

Features:
- Full product data: name, brand, category, price, MRP, discount, unit, weight,
  image URL, product URL, availability, delivery time
- Multi-platform concurrent scraping with Playwright stealth bypass
- Retry mechanism with exponential backoff
- Cookie management + session persistence
- Automated via Celery Beat every 6 hours

Usage (manual):
    cd /opt/pricebasket/backend
    python -m app.scrapers.bulk_product_scraper

Celery task:
    app.workers.price_update_worker.bulk_scrape_all_products
"""

import asyncio
import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import structlog

log = structlog.get_logger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Scraped Product Data Model
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class ScrapedProduct:
    """Full product data collected from a platform."""
    platform_slug: str
    name: str
    brand: str = ""
    category_slug: str = ""
    sub_category: str = ""
    price: float = 0.0
    original_price: float = 0.0
    discount_percent: float = 0.0
    discount_label: str = ""
    unit: str = ""
    weight_grams: Optional[int] = None
    image_url: str = ""
    product_url: str = ""
    description: str = ""
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    is_available: bool = True
    delivery_time_minutes: int = 30
    delivery_charges: float = 0.0
    platform_product_id: str = ""
    scraped_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    query_used: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────
_KNOWN_BRANDS = [
    "Amul", "Mother Dairy", "Britannia", "Parle", "Nestle", "Maggi", "Lays", "Kurkure",
    "Haldirams", "Bingo", "Pringles", "Doritos", "Cadbury", "KitKat", "Snickers",
    "Ferrero", "Oreo", "Sunfeast", "Kelloggs", "Quaker", "Saffola", "Patanjali", "Dabur",
    "Himalaya", "Dove", "Lux", "Dettol", "Lifebuoy", "Pears", "Santoor", "Colgate",
    "Pepsodent", "Sensodyne", "Nivea", "Garnier", "Vaseline", "Parachute", "Bajaj",
    "Axe", "Fogg", "Whisper", "Stayfree", "Gillette", "Surf Excel", "Ariel", "Tide",
    "Rin", "Vim", "Pril", "Harpic", "Domex", "Lizol", "Colin", "Odonil", "Good Knight",
    "Mortein", "Fortune", "Aashirvaad", "Pillsbury", "Tata", "Everest", "MDH", "Catch",
    "Kissan", "Heinz", "Tropicana", "Real", "Coca Cola", "Pepsi", "Sprite", "Red Bull",
    "Monster", "Bisleri", "Kinley", "Aquafina", "Lakme", "Maybelline", "Nykaa", "Colorbar",
    "Biotique", "Lotus", "Neutrogena", "Olay", "Pampers", "Huggies", "Johnson", "Chicco",
    "Pedigree", "Royal Canin", "Whiskas", "boAt", "JBL", "Sony", "Syska", "Portronics",
    "Anker", "Duracell", "Eveready", "Philips", "Havells", "Prestige", "Hawkins",
    "Tupperware", "Cello", "Milton", "Borosil", "Pigeon", "McCain", "Licious", "Zappfresh",
    "Suguna", "Venky's", "Godrej", "ITC", "Epigamia", "Danone", "Figaro", "Borges",
    "DiSano", "India Gate", "Daawat", "Kohinoor", "Bagrry's", "Rajdhani", "MTR", "Bikaji",
    "Cornitos", "TRESemme", "Sunsilk", "Pantene", "Comfort", "Ezee", "Scotch Brite",
    "Nescafe", "Bru", "Lipton", "Tetley", "Kwality Walls", "Haldiram's",
]


def extract_brand(name: str) -> str:
    """Extract brand from product name by matching known brands."""
    name_lower = name.lower()
    for brand in _KNOWN_BRANDS:
        if brand.lower() in name_lower:
            return brand
    words = name.split()
    if words and len(words[0]) > 2 and words[0][0].isupper():
        return words[0]
    return ""


_UOM_ALIASES = {
    "gram": "g", "grams": "g", "gm": "g", "gms": "g",
    "kilogram": "kg", "kilograms": "kg",
    "millilitre": "ml", "milliliter": "ml", "millilitres": "ml", "milliliters": "ml",
    "litre": "L", "liter": "L", "litres": "L", "liters": "L",
    "piece": "pcs", "pieces": "pcs", "pc": "pcs",
}


def normalize_unit(unit: str) -> str:
    """Normalize platform enum-style units (e.g. 'zepto unitOfMeasure' = '46
    MILLILITRE', bigbasket 'w' = '2 KILOGRAM') into a compact display form
    ('46 ml', '2 kg'). Already-compact units like '500 g' pass through unchanged.
    """
    if not unit:
        return unit
    return re.sub(
        r"[A-Za-z]+",
        lambda m: _UOM_ALIASES.get(m.group(0).lower(), m.group(0)),
        unit,
    )


def extract_weight_grams(unit: str) -> Optional[int]:
    """Parse weight in grams from unit string like '500g', '1kg', '200ml'."""
    if not unit:
        return None
    u = normalize_unit(unit).lower().strip()
    m = re.search(r"([\d.]+)\s*kg", u)
    if m:
        return int(float(m.group(1)) * 1000)
    m = re.search(r"([\d.]+)\s*g\b", u)
    if m:
        return int(float(m.group(1)))
    m = re.search(r"([\d.]+)\s*ml", u)
    if m:
        return int(float(m.group(1)))
    m = re.search(r"([\d.]+)\s*l\b", u)
    if m:
        return int(float(m.group(1)) * 1000)
    return None


def make_slug(name: str, unit: str = "") -> str:
    """Generate a URL-safe slug from product name + unit."""
    text = f"{name} {unit}".strip().lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:200]


def calc_discount(price: float, mrp: float) -> Tuple[float, str]:
    """Return (discount_percent, discount_label)."""
    if mrp and mrp > price and price > 0:
        pct = round((mrp - price) / mrp * 100, 1)
        return pct, f"{int(pct)}% OFF"
    return 0.0, ""


# ─────────────────────────────────────────────────────────────────────────────
# Platform scrapers — bulk variant (returns ALL products from a search page)
# ─────────────────────────────────────────────────────────────────────────────

async def scrape_blinkit_bulk(query: str, category_slug: str) -> List[ScrapedProduct]:
    """Return all products Blinkit shows for a search query."""
    from urllib.parse import quote_plus
    from app.scrapers.playwright_pool import get_browser
    from app.config import settings

    lat = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
    lon = str(getattr(settings, "BLINKIT_LON", "77.2090"))
    captured: List[dict] = []

    try:
        async with get_browser() as browser:
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-IN",
                geolocation={"latitude": float(lat), "longitude": float(lon)},
                permissions=["geolocation"],
            )
            try:
                page = await context.new_page()

                async def on_resp(response):
                    if "blinkit.com/v1/layout/search" in response.url and response.status == 200:
                        try:
                            captured.append(await response.json())
                        except Exception:
                            pass

                page.on("response", on_resp)
                await page.goto(
                    f"https://blinkit.com/s/?q={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(2)
                await page.close()
            finally:
                await context.close()
    except Exception as exc:
        log.warning("blinkit_bulk_failed", query=query, error=str(exc))
        return []

    products: List[ScrapedProduct] = []
    for data in captured:
        snippets = data.get("response", {}).get("snippets", [])
        for snippet in snippets:
            if "product_card" not in snippet.get("widget_type", ""):
                continue
            d = snippet.get("data", {})
            name = d.get("name", {}).get("text", "") or d.get("display_name", {}).get("text", "")
            price_text = d.get("normal_price", {}).get("text", "")
            mrp_text = d.get("mrp", {}).get("text", "")
            price = _parse_num(price_text)
            mrp = _parse_num(mrp_text) or price
            unit = normalize_unit(d.get("variant", {}).get("text", ""))
            image = d.get("image", {}).get("url", "")
            if not image:
                items = d.get("media_container", {}).get("items", [])
                if items:
                    image = items[0].get("image", {}).get("url", "")
            pid = str(d.get("product_id", "") or d.get("id", "") or "")
            slug_val = d.get("slug", "") or pid
            url = f"https://blinkit.com/prn/{slug_val}" if slug_val else ""
            disc_pct, disc_label = calc_discount(price, mrp)
            if name and price and price > 0:
                products.append(ScrapedProduct(
                    platform_slug="blinkit",
                    name=name,
                    brand=extract_brand(name),
                    category_slug=category_slug,
                    price=price,
                    original_price=mrp or price,
                    discount_percent=disc_pct,
                    discount_label=disc_label,
                    unit=unit,
                    weight_grams=extract_weight_grams(unit),
                    image_url=image,
                    product_url=url,
                    is_available=True,
                    delivery_time_minutes=10,
                    delivery_charges=0.0,
                    platform_product_id=pid,
                    query_used=query,
                ))
    log.info("blinkit_bulk_done", query=query, count=len(products))
    return products


async def scrape_zepto_bulk(query: str, category_slug: str) -> List[ScrapedProduct]:
    """Return all products Zepto shows for a search query."""
    from urllib.parse import quote_plus
    from app.scrapers.playwright_pool import get_browser
    from app.config import settings

    lat = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
    lon = str(getattr(settings, "BLINKIT_LON", "77.2090"))
    captured: List[dict] = []

    try:
        async with get_browser() as browser:
            context = await browser.new_context(
                viewport={"width": 390, "height": 844},
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                ),
                locale="en-IN",
                geolocation={"latitude": float(lat), "longitude": float(lon)},
                permissions=["geolocation"],
            )
            try:
                page = await context.new_page()

                async def on_resp(response):
                    if "user-search-service/api/v3/search" in response.url and response.status == 200:
                        try:
                            captured.append(await response.json())
                        except Exception:
                            pass

                page.on("response", on_resp)
                await page.goto(
                    f"https://www.zeptonow.com/search?query={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)
                await page.close()
            finally:
                await context.close()
    except Exception as exc:
        log.warning("zepto_bulk_failed", query=query, error=str(exc))
        return []

    products: List[ScrapedProduct] = []
    for data in captured:
        for widget in data.get("layout", []):
            wname = widget.get("widgetName", "")
            if "SEARCHED_PRODUCTS" not in wname and "PRODUCT" not in wname:
                continue
            items = (
                widget.get("data", {})
                .get("resolver", {})
                .get("data", {})
                .get("items", [])
            )
            for item in items:
                pr = item.get("productResponse", item)
                product = pr.get("product", {})
                variant = pr.get("productVariant", {})
                name = product.get("name", "")
                price = _paise(pr.get("discountedSellingPrice") or pr.get("mrp"))
                mrp = _paise(pr.get("mrp") or variant.get("mrp"))
                out_of_stock = pr.get("outOfStock", False)
                images = variant.get("images", [])
                image = ""
                if images:
                    path = images[0].get("path", images[0].get("url", ""))
                    if path:
                        image = path if path.startswith("http") else f"https://cdn.zeptonow.com/production/{path}"
                qty = variant.get("quantity", "")
                uom = variant.get("unitOfMeasure", "")
                unit = normalize_unit(f"{qty} {uom}".strip()) if (qty or uom) else ""
                pid = str(pr.get("productId") or product.get("id") or "")
                url = f"https://www.zeptonow.com/product/{pid}" if pid else ""
                disc_pct, disc_label = calc_discount(price, mrp or price)
                if name and price and price > 0:
                    products.append(ScrapedProduct(
                        platform_slug="zepto",
                        name=name,
                        brand=extract_brand(name),
                        category_slug=category_slug,
                        price=price,
                        original_price=mrp or price,
                        discount_percent=disc_pct,
                        discount_label=disc_label,
                        unit=unit,
                        weight_grams=extract_weight_grams(unit),
                        image_url=image,
                        product_url=url,
                        is_available=not out_of_stock,
                        delivery_time_minutes=8,
                        delivery_charges=0.0,
                        platform_product_id=pid,
                        query_used=query,
                    ))
    log.info("zepto_bulk_done", query=query, count=len(products))
    return products


async def scrape_instamart_bulk(query: str, category_slug: str) -> List[ScrapedProduct]:
    """Return all products Swiggy Instamart shows for a search query."""
    from urllib.parse import quote_plus
    from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

    captured: List[dict] = []

    try:
        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="instamart",
                viewport={"width": 390, "height": 844},
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                ),
            )
            try:
                page = await context.new_page()

                async def on_resp(response):
                    url = response.url
                    if "swiggy.com" in url and "instamart/search" in url and response.status == 200:
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            try:
                                data = await response.json()
                                if isinstance(data, dict):
                                    captured.append(data)
                            except Exception:
                                pass

                page.on("response", on_resp)
                await page.goto("https://www.swiggy.com/instamart", wait_until="networkidle", timeout=30_000)
                await asyncio.sleep(2)
                await page.goto(
                    f"https://www.swiggy.com/instamart/search?query={quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=35_000,
                )
                await asyncio.sleep(4)
                await save_cookies(context, "instamart")
                await page.close()
            finally:
                await context.close()
    except Exception as exc:
        log.warning("instamart_bulk_failed", query=query, error=str(exc))
        return []

    products: List[ScrapedProduct] = []
    for data in captured:
        cards = data.get("data", {}).get("cards", [])
        for card in cards:
            card_data = card.get("card", {}).get("card", {})
            grid = card_data.get("gridElements", {})
            if not grid:
                continue
            info = grid.get("infoWithStyle", {})
            skus = info.get("skus", []) or info.get("items", [])
            for sku in skus:
                name = sku.get("displayName") or sku.get("display_name") or sku.get("name", "")
                variations = sku.get("variations", [])
                price, mrp, image, pid, unit = None, None, "", "", ""
                for v in variations:
                    if not isinstance(v, dict):
                        continue
                    price_obj = v.get("price", {})
                    offer = price_obj.get("offerPrice", {})
                    mrp_obj = price_obj.get("mrp", {})
                    p = _parse_num(offer.get("units") if isinstance(offer, dict) else offer)
                    m = _parse_num(mrp_obj.get("units") if isinstance(mrp_obj, dict) else mrp_obj)
                    if p and p > 0:
                        price = p
                        mrp = m
                        image_ids = v.get("imageIds", [])
                        if image_ids:
                            image = f"https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,h_200,w_200/{image_ids[0]}"
                        pid = str(v.get("skuId", "") or v.get("spinId", ""))
                        unit = normalize_unit(v.get("quantityDescription", "") or v.get("unit_quantity", ""))
                        break
                disc_pct, disc_label = calc_discount(price or 0, mrp or price or 0)
                if name and price and price > 0:
                    products.append(ScrapedProduct(
                        platform_slug="instamart",
                        name=name,
                        brand=extract_brand(name),
                        category_slug=category_slug,
                        price=price,
                        original_price=mrp or price,
                        discount_percent=disc_pct,
                        discount_label=disc_label,
                        unit=unit,
                        weight_grams=extract_weight_grams(unit),
                        image_url=image,
                        product_url="",
                        is_available=sku.get("inStock", True),
                        delivery_time_minutes=15,
                        delivery_charges=0.0,
                        platform_product_id=pid,
                        query_used=query,
                    ))
    log.info("instamart_bulk_done", query=query, count=len(products))
    return products


async def scrape_bigbasket_bulk(query: str, category_slug: str) -> List[ScrapedProduct]:
    """Return all products BigBasket shows for a search query."""
    from urllib.parse import quote_plus
    from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

    captured: List[dict] = []

    try:
        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="bigbasket",
                viewport={"width": 1280, "height": 800},
            )
            try:
                page = await context.new_page()

                async def on_resp(response):
                    url = response.url
                    if "bigbasket.com" not in url or response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" not in ct:
                        return
                    if any(kw in url for kw in ["listing-svc", "get-products", "v2/products", "catalog"]):
                        try:
                            data = await response.json()
                            if data and isinstance(data, dict):
                                captured.append(data)
                        except Exception:
                            pass

                page.on("response", on_resp)
                await page.goto("https://www.bigbasket.com", wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(2)
                await page.goto(
                    f"https://www.bigbasket.com/ps/?q={quote_plus(query)}&nc=as",
                    wait_until="networkidle",
                    timeout=30_000,
                )
                await asyncio.sleep(3)
                await save_cookies(context, "bigbasket")
                await page.close()
            finally:
                await context.close()
    except Exception as exc:
        log.warning("bigbasket_bulk_failed", query=query, error=str(exc))
        return []

    products: List[ScrapedProduct] = []
    for data in captured:
        # 2026 confirmed shape: tabs[0].product_info.products[]
        for tab in data.get("tabs", []):
            pi = tab.get("product_info", {}) if isinstance(tab, dict) else {}
            for p in pi.get("products", []):
                if not isinstance(p, dict):
                    continue
                name = p.get("desc", "") or p.get("name", "")
                pid = str(p.get("id", "") or p.get("requested_sku_id", ""))
                pricing = p.get("pricing", {})
                discount = pricing.get("discount", {}) if isinstance(pricing, dict) else {}
                prim = discount.get("prim_price", {}) if isinstance(discount, dict) else {}
                price = _parse_num(prim.get("sp") if isinstance(prim, dict) else None)
                mrp = _parse_num(discount.get("mrp") if isinstance(discount, dict) else None)
                if not price:
                    price = _parse_num(p.get("sp") or p.get("selling_price"))
                if not mrp:
                    mrp = _parse_num(p.get("mrp"))
                abs_url = p.get("absolute_url", "")
                url = f"https://www.bigbasket.com{abs_url}" if abs_url else ""
                img_obj = p.get("img", {})
                image = ""
                if isinstance(img_obj, dict):
                    image = img_obj.get("s", "") or img_obj.get("m", "")
                elif isinstance(img_obj, str):
                    image = img_obj
                avail = p.get("availability", {})
                in_stock = avail.get("avail_status", "001") == "001" if isinstance(avail, dict) else True
                unit = normalize_unit(p.get("w", ""))
                disc_pct, disc_label = calc_discount(price or 0, mrp or price or 0)
                if name and price and price > 0:
                    products.append(ScrapedProduct(
                        platform_slug="bigbasket",
                        name=name,
                        brand=extract_brand(name),
                        category_slug=category_slug,
                        price=price,
                        original_price=mrp or price,
                        discount_percent=disc_pct,
                        discount_label=disc_label,
                        unit=unit,
                        weight_grams=extract_weight_grams(unit),
                        image_url=image,
                        product_url=url,
                        is_available=in_stock,
                        delivery_time_minutes=30,
                        delivery_charges=0.0,
                        platform_product_id=pid,
                        query_used=query,
                    ))
    log.info("bigbasket_bulk_done", query=query, count=len(products))
    return products


async def scrape_jiomart_bulk(query: str, category_slug: str) -> List[ScrapedProduct]:
    """Return all products JioMart shows for a search query (DOM-based)."""
    from urllib.parse import quote_plus
    from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies
    from app.scrapers.jiomart_scraper import _DOM_EXTRACT_JS

    captured_api: List[dict] = []

    try:
        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="jiomart",
                viewport={"width": 1280, "height": 900},
            )
            try:
                page = await context.new_page()

                async def on_resp(response):
                    url = response.url
                    if "jiomart.com" not in url or response.status != 200:
                        return
                    ct = response.headers.get("content-type", "")
                    if "json" not in ct:
                        return
                    if any(kw in url for kw in ["deliverable/products", "catalog/items", "product/list", "search/products"]):
                        try:
                            data = await response.json()
                            if isinstance(data, dict):
                                captured_api.append(data)
                        except Exception:
                            pass

                page.on("response", on_resp)
                await page.goto("https://www.jiomart.com", wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(1)
                await page.goto(
                    f"https://www.jiomart.com/search#{quote_plus(query)}",
                    wait_until="networkidle",
                    timeout=35_000,
                )
                await asyncio.sleep(3)
                for selector in ["[id^='product_']", "[class*='sku-card']", "[data-product-id]"]:
                    try:
                        await page.wait_for_selector(selector, timeout=5_000)
                        break
                    except Exception:
                        continue
                await asyncio.sleep(2)
                dom_products = await page.evaluate(_DOM_EXTRACT_JS)
                if not dom_products:
                    await page.mouse.wheel(0, 500)
                    await asyncio.sleep(2)
                    dom_products = await page.evaluate(_DOM_EXTRACT_JS)
                await save_cookies(context, "jiomart")
                await page.close()
            finally:
                await context.close()
    except Exception as exc:
        log.warning("jiomart_bulk_failed", query=query, error=str(exc))
        return []

    products: List[ScrapedProduct] = []

    # Try API responses first
    for data in captured_api:
        items = (
            data.get("items", [])
            or data.get("data", {}).get("products", [])
            or data.get("products", [])
            or []
        )
        for item in items:
            name = item.get("name", "") or item.get("display_name", "")
            price = _parse_num(item.get("price") or item.get("offer_price") or item.get("selling_price"))
            mrp = _parse_num(item.get("mrp") or item.get("original_price")) or price
            images = item.get("images", [])
            image = ""
            if images:
                image = images[0].get("url", "") if isinstance(images[0], dict) else images[0]
            pid = str(item.get("uid", "") or item.get("id", "") or "")
            disc_pct, disc_label = calc_discount(price or 0, mrp or price or 0)
            if name and price and price > 0:
                products.append(ScrapedProduct(
                    platform_slug="jiomart",
                    name=name,
                    brand=extract_brand(name),
                    category_slug=category_slug,
                    price=price,
                    original_price=mrp or price,
                    discount_percent=disc_pct,
                    discount_label=disc_label,
                    image_url=image,
                    product_url=f"https://www.jiomart.com/p/{pid}" if pid else "",
                    is_available=True,
                    delivery_time_minutes=30,
                    platform_product_id=pid,
                    query_used=query,
                ))

    # Fallback: DOM results
    if not products and dom_products:
        for item in dom_products:
            price = float(item.get("price", 0) or 0)
            mrp = float(item.get("mrp", price) or price)
            name = item.get("name", "")
            pid = str(item.get("pid", ""))
            disc_pct, disc_label = calc_discount(price, mrp)
            if name and price > 0:
                products.append(ScrapedProduct(
                    platform_slug="jiomart",
                    name=name,
                    brand=extract_brand(name),
                    category_slug=category_slug,
                    price=price,
                    original_price=mrp or price,
                    discount_percent=disc_pct,
                    discount_label=disc_label,
                    image_url=item.get("image_url", ""),
                    product_url=item.get("href", ""),
                    is_available=True,
                    delivery_time_minutes=30,
                    platform_product_id=pid,
                    query_used=query,
                ))

    log.info("jiomart_bulk_done", query=query, count=len(products))
    return products


async def scrape_amazon_bulk(query: str, category_slug: str) -> List[ScrapedProduct]:
    """Return all products Amazon Fresh/Now shows for a search query."""
    from urllib.parse import quote_plus
    from app.scrapers.playwright_pool import get_browser, new_stealth_context, save_cookies

    captured_dom: List[dict] = []

    try:
        async with get_browser() as browser:
            context = await new_stealth_context(
                browser,
                platform="amazon",
                viewport={"width": 1366, "height": 768},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
            )
            try:
                page = await context.new_page()
                await page.goto("https://www.amazon.in", wait_until="domcontentloaded", timeout=20_000)
                await asyncio.sleep(1)
                search_url = f"https://www.amazon.in/s?k={quote_plus(query)}&i=nowstore&ref=nb_sb_noss_1"
                await page.goto(search_url, wait_until="networkidle", timeout=35_000)
                await asyncio.sleep(3)
                dom_result = await page.evaluate("""
                    () => {
                        const results = [];
                        const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
                        cards.forEach(card => {
                            try {
                                const asin = card.getAttribute('data-asin') || '';
                                const priceWhole = card.querySelector('.a-price-whole');
                                let price = 0;
                                if (priceWhole) {
                                    price = parseInt(priceWhole.textContent.replace(/[^0-9]/g, '')) || 0;
                                }
                                if (!price) {
                                    const m = card.textContent.match(/\u20b9\\s*([0-9,]+)/);
                                    if (m) price = parseInt(m[1].replace(/,/g, '')) || 0;
                                }
                                const mrpEl = card.querySelector('.a-price.a-text-price .a-offscreen');
                                let mrp = 0;
                                if (mrpEl) {
                                    mrp = parseInt(mrpEl.textContent.replace(/[^0-9]/g, '')) || 0;
                                }
                                const titleEl = card.querySelector('h2 a span, .a-size-base-plus, .a-size-medium');
                                const title = titleEl ? titleEl.textContent.trim() : '';
                                const imgEl = card.querySelector('img.s-image');
                                const img = imgEl ? imgEl.src : '';
                                const linkEl = card.querySelector('h2 a');
                                const href = linkEl ? 'https://www.amazon.in' + linkEl.getAttribute('href') : '';
                                if (asin && price > 50 && price < 500000) {
                                    results.push({asin, price, mrp: mrp || price, title, img, href});
                                }
                            } catch(e) {}
                        });
                        return results;
                    }
                """)
                if dom_result and isinstance(dom_result, list):
                    captured_dom.extend(dom_result)
                await save_cookies(context, "amazon")
                await page.close()
            finally:
                await context.close()
    except Exception as exc:
        log.warning("amazon_bulk_failed", query=query, error=str(exc))
        return []

    products: List[ScrapedProduct] = []
    for item in captured_dom:
        price = float(item.get("price", 0) or 0)
        mrp = float(item.get("mrp", price) or price)
        name = item.get("title", "")
        asin = item.get("asin", "")
        disc_pct, disc_label = calc_discount(price, mrp)
        if name and price > 0:
            products.append(ScrapedProduct(
                platform_slug="amazon",
                name=name,
                brand=extract_brand(name),
                category_slug=category_slug,
                price=price,
                original_price=mrp or price,
                discount_percent=disc_pct,
                discount_label=disc_label,
                image_url=item.get("img", ""),
                product_url=item.get("href", f"https://www.amazon.in/dp/{asin}"),
                is_available=True,
                delivery_time_minutes=120,
                delivery_charges=0.0,
                platform_product_id=asin,
                query_used=query,
            ))
    log.info("amazon_bulk_done", query=query, count=len(products))
    return products


# ─────────────────────────────────────────────────────────────────────────────
# Price parsing helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_num(val) -> Optional[float]:
    """Parse a price value from various formats."""
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def _paise(val) -> Optional[float]:
    """Convert Zepto paise to rupees."""
    if val is None:
        return None
    try:
        v = float(val)
        return round(v / 100.0, 2) if v > 500 else v
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Database persistence
# ─────────────────────────────────────────────────────────────────────────────

async def save_products_to_db(products: List[ScrapedProduct]) -> dict:
    """
    Upsert scraped products into the database.
    - Creates Category rows if missing
    - Creates/updates Product rows (upsert by slug)
    - Creates/updates PlatformPrice rows
    Returns stats dict.
    """
    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.database import AsyncSessionLocal
    from app.models.product import Category, Product
    from app.models.price import PlatformPrice
    from app.models.platform import Platform

    stats = {"products_created": 0, "products_updated": 0, "prices_upserted": 0, "errors": 0}
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        # Load all platforms into a slug→id map
        result = await db.execute(select(Platform))
        platform_map: Dict[str, uuid.UUID] = {p.slug: p.id for p in result.scalars().all()}

        # Load or create categories
        cat_map: Dict[str, uuid.UUID] = {}
        result = await db.execute(select(Category))
        for cat in result.scalars().all():
            cat_map[cat.slug] = cat.id

        # Ensure all needed categories exist
        needed_cats = {p.category_slug for p in products if p.category_slug}
        for cat_slug in needed_cats:
            if cat_slug not in cat_map and cat_slug in CATEGORY_HIERARCHY:
                meta = CATEGORY_HIERARCHY[cat_slug]
                new_cat = Category(
                    slug=cat_slug,
                    name=meta["name"],
                    icon=meta.get("icon", ""),
                    display_order=meta.get("display_order", 99),
                )
                db.add(new_cat)
                await db.flush()
                cat_map[cat_slug] = new_cat.id
                log.info("category_created", slug=cat_slug)
        await db.commit()

        # Process each product
        for sp in products:
            try:
                slug = make_slug(sp.name, sp.unit)
                if not slug:
                    continue

                cat_id = cat_map.get(sp.category_slug)

                # Upsert product
                result = await db.execute(select(Product).where(Product.slug == slug))
                existing = result.scalar_one_or_none()

                if existing:
                    # Update fields that may have improved
                    if sp.brand and not existing.brand:
                        existing.brand = sp.brand
                    if sp.image_url and not existing.image_url:
                        existing.image_url = sp.image_url
                    # Always sync thumbnail_url from image_url when thumbnail is missing.
                    # The home page ProductCard cascades image_url → thumbnail_url →
                    # platform_image_url. Without thumbnail_url the card falls through
                    # to platform_image_url which causes a blank flash on first render.
                    if sp.image_url and not existing.thumbnail_url:
                        existing.thumbnail_url = sp.image_url
                    if sp.unit and not existing.unit:
                        existing.unit = sp.unit
                    if sp.weight_grams and not existing.weight_grams:
                        existing.weight_grams = sp.weight_grams
                    if cat_id and not existing.category_id:
                        existing.category_id = cat_id
                    existing.is_featured = True   # ensure it appears on home page
                    existing.updated_at = now
                    product_id = existing.id
                    stats["products_updated"] += 1
                else:
                    new_product = Product(
                        slug=slug,
                        name=sp.name,
                        brand=sp.brand or None,
                        category_id=cat_id,
                        unit=sp.unit or None,
                        weight_grams=sp.weight_grams,
                        image_url=sp.image_url or None,
                        # thumbnail_url mirrors image_url so the home page ProductCard
                        # always has a usable image on the very first render.
                        thumbnail_url=sp.image_url or None,
                        tags=[sp.category_slug] if sp.category_slug else None,
                        is_active=True,
                        is_featured=True,   # scraped products should appear on home page
                    )
                    db.add(new_product)
                    await db.flush()
                    product_id = new_product.id
                    stats["products_created"] += 1

                # Upsert platform price
                platform_id = platform_map.get(sp.platform_slug)
                if platform_id:
                    await db.execute(
                        pg_insert(PlatformPrice)
                        .values(
                            id=uuid.uuid4(),
                            product_id=product_id,
                            platform_id=platform_id,
                            price=sp.price,
                            original_price=sp.original_price if sp.original_price != sp.price else None,
                            discount_percent=sp.discount_percent,
                            discount_label=sp.discount_label or None,
                            is_available=sp.is_available,
                            delivery_time_minutes=sp.delivery_time_minutes,
                            platform_product_id=sp.platform_product_id or None,
                            platform_product_url=sp.product_url or None,
                            platform_image_url=sp.image_url or None,
                            last_updated=now,
                            source="bulk_scrape",
                        )
                        .on_conflict_do_update(
                            constraint="uq_platform_prices_product_platform",
                            set_=dict(
                                price=sp.price,
                                original_price=sp.original_price if sp.original_price != sp.price else None,
                                discount_percent=sp.discount_percent,
                                discount_label=sp.discount_label or None,
                                is_available=sp.is_available,
                                delivery_time_minutes=sp.delivery_time_minutes,
                                platform_product_id=sp.platform_product_id or None,
                                platform_product_url=sp.product_url or None,
                                platform_image_url=sp.image_url or None,
                                last_updated=now,
                                source="bulk_scrape",
                            ),
                        )
                    )
                    stats["prices_upserted"] += 1

            except Exception as exc:
                log.warning("product_save_error", name=sp.name, error=str(exc))
                stats["errors"] += 1
                continue

        await db.commit()

    return stats


# ─────────────────────────────────────────────────────────────────────────────
# Main orchestrator
# ─────────────────────────────────────────────────────────────────────────────

from app.scrapers.bulk_product_catalog import CATEGORY_HIERARCHY, PRODUCT_QUERIES  # noqa: E402

PLATFORM_SCRAPERS = {
    "blinkit":   scrape_blinkit_bulk,
    "zepto":     scrape_zepto_bulk,
    "instamart": scrape_instamart_bulk,
    "bigbasket": scrape_bigbasket_bulk,
    "jiomart":   scrape_jiomart_bulk,
    "amazon":    scrape_amazon_bulk,
}


async def run_bulk_scrape(
    platforms: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    max_concurrent_queries: int = 3,
) -> dict:
    """
    Main entry point for bulk product scraping.

    Args:
        platforms: list of platform slugs to scrape (default: all)
        categories: list of category slugs to scrape (default: all)
        max_concurrent_queries: how many queries to run in parallel per platform

    Returns:
        Summary stats dict
    """
    start_time = time.time()
    platforms = platforms or list(PLATFORM_SCRAPERS.keys())
    categories = categories or list(PRODUCT_QUERIES.keys())

    log.info("bulk_scrape_start", platforms=platforms, categories=categories)

    all_products: List[ScrapedProduct] = []
    total_stats = {
        "products_created": 0,
        "products_updated": 0,
        "prices_upserted": 0,
        "errors": 0,
        "scraped_total": 0,
    }

    semaphore = asyncio.Semaphore(max_concurrent_queries)

    async def scrape_with_sem(scraper_fn, query: str, cat_slug: str) -> List[ScrapedProduct]:
        async with semaphore:
            try:
                return await scraper_fn(query, cat_slug)
            except Exception as exc:
                log.warning("query_scrape_error", query=query, error=str(exc))
                return []

    for platform_slug in platforms:
        scraper_fn = PLATFORM_SCRAPERS.get(platform_slug)
        if not scraper_fn:
            log.warning("unknown_platform", slug=platform_slug)
            continue

        log.info("platform_scrape_start", platform=platform_slug)
        platform_products: List[ScrapedProduct] = []

        for cat_slug in categories:
            queries = PRODUCT_QUERIES.get(cat_slug, [])
            if not queries:
                continue

            # Fan-out all queries for this category concurrently (with semaphore)
            tasks = [scrape_with_sem(scraper_fn, q, cat_slug) for q in queries]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for res in results:
                if isinstance(res, list):
                    platform_products.extend(res)

            log.info("category_done", platform=platform_slug, category=cat_slug,
                     count=sum(len(r) for r in results if isinstance(r, list)))

        # Deduplicate within platform by (name+unit) to avoid saving same product twice
        seen: set = set()
        deduped: List[ScrapedProduct] = []
        for p in platform_products:
            key = (p.platform_slug, make_slug(p.name, p.unit))
            if key not in seen:
                seen.add(key)
                deduped.append(p)

        log.info("platform_scrape_done", platform=platform_slug,
                 raw=len(platform_products), deduped=len(deduped))
        all_products.extend(deduped)
        total_stats["scraped_total"] += len(deduped)

        # Save to DB after each platform (avoid huge memory spike)
        if deduped:
            stats = await save_products_to_db(deduped)
            for k, v in stats.items():
                total_stats[k] = total_stats.get(k, 0) + v
            log.info("platform_saved_to_db", platform=platform_slug, **stats)

    elapsed = round(time.time() - start_time, 1)
    total_stats["elapsed_seconds"] = elapsed
    log.info("bulk_scrape_complete", **total_stats)
    return total_stats


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import os

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

    # Optional CLI args: python -m app.scrapers.bulk_product_scraper blinkit zepto
    cli_platforms = sys.argv[1:] if len(sys.argv) > 1 else None

    async def main():
        stats = await run_bulk_scrape(platforms=cli_platforms)
        print("\n" + "=" * 60)
        print("BULK SCRAPE COMPLETE")
        print("=" * 60)
        for k, v in stats.items():
            print(f"  {k}: {v}")

    asyncio.run(main())