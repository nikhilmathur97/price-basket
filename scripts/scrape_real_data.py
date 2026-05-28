#!/usr/bin/env python3
"""
PriceBasket — Final working Playwright scraper.
Correctly parses Blinkit and Zepto response structures.

Blinkit:   POST /v1/layout/search
           → data["response"]["snippets"][x]["data"]["name"]["text"]
           → data["response"]["snippets"][x]["data"]["normal_price"]["text"]
Zepto:     POST bff-gateway.zepto.com/user-search-service/api/v3/search
           → data["layout"][x]["data"]["resolver"]["data"]["items"][y]["productResponse"]
Instamart: POST /api/instamart/search/v2
BigBasket: GET  /product/get-products/?q=QUERY&nc=as  (via browser session)
JioMart:   HTML DOM scraping

Run: backend/.venv_mac/bin/python3 scripts/scrape_real_data.py
"""
import asyncio
import json
import os
import sys
import uuid
import re
from typing import Optional
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from playwright.async_api import async_playwright, BrowserContext

# ── Config ────────────────────────────────────────────────────────────────────
LAT = 26.9124
LON = 75.7873
CITY = "Jaipur"

SEARCH_QUERIES = [
    # ── Dairy & Breakfast ─────────────────────────────────────────────────────
    "milk",
    "butter",
    "eggs",
    "yogurt curd",
    "cheese",
    "paneer",
    "cream",
    "cornflakes cereal",
    "oats",
    "muesli",

    # ── Staples ───────────────────────────────────────────────────────────────
    "rice",
    "atta wheat flour",
    "sugar",
    "salt",
    "dal lentils",
    "chana dal",
    "urad dal",
    "moong dal",
    "poha",
    "suji semolina",
    "besan gram flour",
    "rajma kidney beans",

    # ── Oils & Spices ─────────────────────────────────────────────────────────
    "cooking oil",
    "ghee",
    "mustard oil",
    "olive oil",
    "honey",
    "turmeric haldi",
    "cumin jeera",
    "coriander powder dhania",
    "garam masala",
    "red chilli powder",
    "black pepper",

    # ── Fruits & Vegetables ───────────────────────────────────────────────────
    "tomato",
    "onion",
    "potato",
    "banana",
    "apple",
    "spinach palak",
    "capsicum shimla mirch",
    "carrot gajar",
    "cucumber kheera",
    "garlic lehsun",
    "ginger adrak",
    "green chilli",
    "coriander dhania leaves",
    "pineapple",
    "watermelon",
    "grapes",
    "pomegranate anaar",
    "cauliflower",
    "brinjal baingan",
    "bhindi lady finger",
    "methi fenugreek",
    "peas matar",
    "radish mooli",
    "lemon nimbu",

    # ── Snacks & Drinks ───────────────────────────────────────────────────────
    "biscuits",
    "chips",
    "noodles",
    "cold drink cola",
    "mango juice",
    "energy drink",
    "nachos",
    "popcorn",
    "namkeen mixture",
    "dry fruits",
    "cashew nuts",
    "almonds",
    "peanuts",
    "chocolate",
    "candy",

    # ── Bakery ────────────────────────────────────────────────────────────────
    "bread",
    "pav bun",
    "cake rusk",

    # ── Personal Care ─────────────────────────────────────────────────────────
    "soap",
    "shampoo",
    "toothpaste",
    "body lotion",
    "face wash",
    "face cream",
    "deodorant",
    "razor",
    "baby powder",
    "sunscreen",
    "lip balm",
    "hand wash",

    # ── Household ─────────────────────────────────────────────────────────────
    "detergent",
    "dishwash bar",
    "floor cleaner",
    "toilet cleaner",
    "antiseptic liquid dettol",
    "scrub pad",
    "air freshener",
    "mosquito repellent",
    "garbage bags",
    "tissue paper",

    # ── Beverages ─────────────────────────────────────────────────────────────
    "tea",
    "coffee",
    "green tea",
    "protein shake",

    # ── Chicken & Meat ────────────────────────────────────────────────────────
    "chicken breast boneless",
    "chicken curry cut",
    "mutton keema",
    "chicken wings",

    # ── Frozen Foods ─────────────────────────────────────────────────────────
    "frozen peas",
    "french fries frozen",
    "ice cream",
    "frozen corn",
    "frozen vegetables mix",

    # ── Baby Care ─────────────────────────────────────────────────────────────
    "diapers pampers",
    "baby food cerelac",
    "baby shampoo johnson",
    "baby oil",

    # ── Pet Care ──────────────────────────────────────────────────────────────
    "dog food pedigree",
    "cat food whiskas",
    "pet treats",
]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse_price_text(text) -> Optional[float]:
    """Parse price from text like '₹68' or '68' or 68 or 68.50"""
    if text is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(text))
        return float(cleaned) if cleaned else None
    except Exception:
        return None


def paise_to_rupees(val) -> Optional[float]:
    """Convert paise (integer) to rupees. Zepto prices are in paise."""
    if val is None:
        return None
    try:
        v = float(val)
        # If value looks like paise (> 500 for common grocery items), convert
        # Milk 500ml = ~₹30 = 3000 paise; ₹3000 would be unrealistic
        if v > 500:
            return round(v / 100.0, 2)
        return v
    except Exception:
        return None


# ── Blinkit Parser ────────────────────────────────────────────────────────────
def parse_blinkit_response(data: dict, query: str) -> list:
    """
    Structure: data["response"]["snippets"][x]
      snippet["widget_type"] == "product_card_snippet_type_2"
      snippet["data"]["name"]["text"]          → product name
      snippet["data"]["normal_price"]["text"]  → selling price e.g. "₹68"
      snippet["data"]["mrp"]["text"]           → MRP (optional)
      snippet["data"]["variant"]["text"]       → unit e.g. "1 L"
      snippet["data"]["image"]["url"]          → image URL
    """
    results = []
    snippets = data.get("response", {}).get("snippets", [])

    for snippet in snippets:
        if "product_card" not in snippet.get("widget_type", ""):
            continue
        d = snippet.get("data", {})

        name = (
            d.get("name", {}).get("text", "")
            or d.get("display_name", {}).get("text", "")
        )
        price = parse_price_text(d.get("normal_price", {}).get("text", ""))
        mrp = parse_price_text(d.get("mrp", {}).get("text", "")) or price
        unit = d.get("variant", {}).get("text", "")
        image = d.get("image", {}).get("url", "")

        # Fallback image from media_container
        if not image:
            items = d.get("media_container", {}).get("items", [])
            if items:
                image = items[0].get("image", {}).get("url", "")

        if name and price:
            results.append({
                "platform": "blinkit",
                "name": name,
                "price": price,
                "mrp": mrp or price,
                "image_url": image,
                "unit": unit,
                "in_stock": True,
                "query": query,
            })

    return results


# ── Zepto Parser ──────────────────────────────────────────────────────────────
def parse_zepto_response(data: dict, query: str) -> list:
    """
    Structure: data["layout"][x]
      widget["widgetName"] contains "SEARCHED_PRODUCTS"
      widget["data"]["resolver"]["data"]["items"][y]["productResponse"]
        productResponse["product"]["name"]              → product name
        productResponse["discountedSellingPrice"]       → price in paise
        productResponse["mrp"]                          → MRP in paise
        productResponse["productVariant"]["images"][0]["path"] → image
        productResponse["productVariant"]["quantity"]   → quantity
        productResponse["productVariant"]["unitOfMeasure"] → unit
        productResponse["outOfStock"]                   → bool
    """
    results = []
    layout = data.get("layout", [])

    for widget in layout:
        widget_name = widget.get("widgetName", "")
        if "SEARCHED_PRODUCTS" not in widget_name and "PRODUCT" not in widget_name:
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
            price = paise_to_rupees(
                pr.get("discountedSellingPrice") or pr.get("mrp")
            )
            mrp = paise_to_rupees(pr.get("mrp") or variant.get("mrp"))
            out_of_stock = pr.get("outOfStock", False)

            # Image from variant
            images = variant.get("images", [])
            image = ""
            if images:
                img = images[0]
                path = img.get("path", img.get("url", ""))
                if path:
                    image = path if path.startswith("http") else f"https://cdn.zeptonow.com/production/{path}"

            qty = variant.get("quantity", "")
            uom = variant.get("unitOfMeasure", "")
            unit = f"{qty} {uom}".strip() if qty or uom else ""

            if name and price:
                results.append({
                    "platform": "zepto",
                    "name": name,
                    "price": price,
                    "mrp": mrp or price,
                    "image_url": image,
                    "unit": unit,
                    "in_stock": not out_of_stock,
                    "query": query,
                })

    return results


# ── Instamart Parser ──────────────────────────────────────────────────────────
def parse_instamart_response(data: dict, query: str) -> list:
    results = []
    widgets = (
        data.get("data", {}).get("widgets", [])
        or data.get("widgets", [])
        or []
    )
    for widget in widgets:
        skus = widget.get("data", {}).get("skus", []) or widget.get("skus", []) or []
        for sku in skus:
            name = sku.get("display_name", sku.get("name", ""))
            price_obj = sku.get("price", {})
            if isinstance(price_obj, dict):
                price = parse_price_text(
                    price_obj.get("offer_price") or price_obj.get("mrp")
                )
                mrp = parse_price_text(price_obj.get("mrp"))
            else:
                price = parse_price_text(price_obj)
                mrp = price
            imgs = sku.get("images", [])
            image = imgs[0].get("url", "") if imgs else ""
            if name and price:
                results.append({
                    "platform": "instamart",
                    "name": name,
                    "price": price,
                    "mrp": mrp or price,
                    "image_url": image,
                    "unit": sku.get("unit_quantity", ""),
                    "in_stock": sku.get("is_available", True),
                    "query": query,
                })
    return results


# ── Blinkit Scraper ───────────────────────────────────────────────────────────
async def scrape_blinkit(context: BrowserContext, query: str) -> list:
    page = await context.new_page()
    results = []
    captured = []

    async def on_response(response):
        if "blinkit.com/v1/layout/search" in response.url and response.status == 200:
            try:
                data = await response.json()
                captured.append(data)
            except Exception:
                pass

    page.on("response", on_response)

    try:
        await page.goto(
            f"https://blinkit.com/s/?q={query}",
            wait_until="networkidle",
            timeout=30000,
        )
        await asyncio.sleep(2)

        for data in captured:
            results.extend(parse_blinkit_response(data, query))

        print(f"  Blinkit '{query}': {len(results)} products")
    except Exception as e:
        print(f"  Blinkit '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── Zepto Scraper ─────────────────────────────────────────────────────────────
async def scrape_zepto(context: BrowserContext, query: str) -> list:
    page = await context.new_page()
    results = []
    captured = []

    async def on_response(response):
        if "user-search-service/api/v3/search" in response.url and response.status == 200:
            try:
                data = await response.json()
                captured.append(data)
            except Exception:
                pass

    page.on("response", on_response)

    try:
        await page.goto(
            f"https://www.zeptonow.com/search?query={query}",
            wait_until="networkidle",
            timeout=30000,
        )
        await asyncio.sleep(3)

        for data in captured:
            results.extend(parse_zepto_response(data, query))

        print(f"  Zepto '{query}': {len(results)} products")
    except Exception as e:
        print(f"  Zepto '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── Instamart Scraper ─────────────────────────────────────────────────────────
async def scrape_instamart(context: BrowserContext, query: str) -> list:
    page = await context.new_page()
    results = []
    captured = []

    async def on_response(response):
        url = response.url
        if "swiggy.com" in url and "instamart" in url and "search" in url and response.status == 200:
            ct = response.headers.get("content-type", "")
            if "json" in ct:
                try:
                    data = await response.json()
                    captured.append(data)
                except Exception:
                    pass

    page.on("response", on_response)

    try:
        await page.goto(
            f"https://www.swiggy.com/instamart/search?query={query}",
            wait_until="networkidle",
            timeout=30000,
        )
        await asyncio.sleep(3)

        for data in captured:
            results.extend(parse_instamart_response(data, query))

        # Fallback: direct API call from browser context
        if not results:
            api_result = await page.evaluate(
                """async (q) => {
                    try {
                        const r = await fetch('/api/instamart/search/v2?offset=0&ageConsent=false&storeId=&primaryStoreId=&secondaryStoreId=', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                facets: [], sortAttribute: '', query: q,
                                search_results_offset: '0',
                                page_type: 'INSTAMART_SEARCH_PAGE',
                                is_pre_search_tag: false
                            })
                        });
                        if (r.ok) return await r.json();
                        return {error: r.status};
                    } catch(e) { return {error: String(e)}; }
                }""",
                query,
            )
            if api_result and not api_result.get("error"):
                results.extend(parse_instamart_response(api_result, query))

        print(f"  Instamart '{query}': {len(results)} products")
    except Exception as e:
        print(f"  Instamart '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── BigBasket Scraper ─────────────────────────────────────────────────────────
async def scrape_bigbasket(context: BrowserContext, query: str) -> list:
    page = await context.new_page()
    results = []

    try:
        await page.goto(
            f"https://www.bigbasket.com/ps/?q={query}",
            wait_until="networkidle",
            timeout=30000,
        )
        await asyncio.sleep(3)

        # Call API from browser context (has session cookies + location)
        api_result = await page.evaluate(
            """async (q) => {
                try {
                    const r = await fetch('/product/get-products/?q=' + encodeURIComponent(q) + '&nc=as', {
                        headers: {Accept: 'application/json, text/plain, */*'}
                    });
                    if (r.ok) return await r.json();
                    return {error: r.status};
                } catch(e) { return {error: String(e)}; }
            }""",
            query,
        )

        if api_result and not api_result.get("error"):
            for tab in api_result.get("tab_info", []):
                if not isinstance(tab, dict):
                    continue
                for v in tab.values():
                    if isinstance(v, list) and v and isinstance(v[0], dict):
                        if any(k in v[0] for k in ["sp", "mrp", "desc"]):
                            for p in v:
                                name = p.get("desc", "")
                                price = parse_price_text(p.get("sp"))
                                mrp = parse_price_text(p.get("mrp"))
                                img = p.get("img", {})
                                image = img.get("s", "") if isinstance(img, dict) else ""
                                if name and price:
                                    results.append({
                                        "platform": "bigbasket",
                                        "name": name,
                                        "price": price,
                                        "mrp": mrp or price,
                                        "image_url": image,
                                        "unit": p.get("w", ""),
                                        "in_stock": p.get("oos", 0) == 0,
                                        "query": query,
                                    })

        print(f"  BigBasket '{query}': {len(results)} products")
    except Exception as e:
        print(f"  BigBasket '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── JioMart Scraper ───────────────────────────────────────────────────────────
async def scrape_jiomart(context: BrowserContext, query: str) -> list:
    page = await context.new_page()
    results = []

    try:
        await page.goto(
            f"https://www.jiomart.com/search/{query}",
            wait_until="networkidle",
            timeout=30000,
        )
        await asyncio.sleep(3)

        products = await page.evaluate(
            """() => {
                const out = [];
                document.querySelectorAll('[data-product-id], .product-card, .sku-card, [class*="ProductCard"]').forEach(card => {
                    try {
                        const name = card.querySelector('[class*="name"],[class*="title"],h3,h4,p[class*="name"]')?.textContent?.trim();
                        const priceEl = card.querySelector('[class*="offer-price"],[class*="price"],[class*="Price"]');
                        const price = priceEl?.textContent?.replace(/[^0-9.]/g,'');
                        const img = card.querySelector('img')?.src || '';
                        if (name && price && parseFloat(price) > 0)
                            out.push({name, price: parseFloat(price), image_url: img});
                    } catch(e) {}
                });
                return out;
            }"""
        )

        for p in products[:20]:
            if p.get("name") and p.get("price"):
                results.append({
                    "platform": "jiomart",
                    "name": p["name"],
                    "price": float(p["price"]),
                    "mrp": float(p["price"]),
                    "image_url": p.get("image_url", ""),
                    "unit": "",
                    "in_stock": True,
                    "query": query,
                })

        print(f"  JioMart '{query}': {len(results)} products")
    except Exception as e:
        print(f"  JioMart '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── Amazon Fresh Scraper ───────────────────────────────────────────────────────
async def scrape_amazon(context: BrowserContext, query: str) -> list:
    """
    Scrape Amazon Fresh (nowstore) search results via DOM extraction.
    Amazon blocks direct API calls; Playwright with a real browser session works.
    """
    page = await context.new_page()
    results = []

    try:
        await page.goto(
            f"https://www.amazon.in/s?k={query}&i=nowstore",
            wait_until="networkidle",
            timeout=35000,
        )
        await asyncio.sleep(3)

        products = await page.evaluate(
            """() => {
                const out = [];
                const cards = document.querySelectorAll(
                    '[data-component-type="s-search-result"][data-asin]'
                );
                cards.forEach(card => {
                    try {
                        const asin = card.getAttribute('data-asin') || '';
                        if (!asin) return;
                        const nameEl = card.querySelector('h2 a span, h2 span');
                        const name = nameEl?.textContent?.trim();
                        const priceWhole = card.querySelector('.a-price-whole')?.textContent?.replace(/[^0-9]/g,'');
                        const priceFrac = card.querySelector('.a-price-fraction')?.textContent?.replace(/[^0-9]/g,'') || '00';
                        const mrpEl = card.querySelector('.a-price.a-text-price .a-offscreen');
                        const mrp = mrpEl?.textContent?.replace(/[^0-9.]/g,'');
                        const img = card.querySelector('img.s-image')?.src || '';
                        const unit = card.querySelector('.a-size-base.a-color-secondary')?.textContent?.trim() || '';
                        if (name && priceWhole && parseInt(priceWhole) > 0) {
                            out.push({
                                asin, name,
                                price: parseFloat(priceWhole + '.' + priceFrac),
                                mrp: mrp ? parseFloat(mrp) : null,
                                image_url: img,
                                unit,
                            });
                        }
                    } catch(e) {}
                });
                return out;
            }"""
        )

        for p in products[:25]:
            if p.get("name") and p.get("price") and float(p["price"]) > 0:
                price = float(p["price"])
                mrp = float(p["mrp"]) if p.get("mrp") else price
                results.append({
                    "platform": "amazon",
                    "name": p["name"][:200],
                    "price": price,
                    "mrp": mrp if mrp >= price else price,
                    "image_url": p.get("image_url", ""),
                    "unit": p.get("unit", ""),
                    "in_stock": True,
                    "query": query,
                })

        print(f"  Amazon '{query}': {len(results)} products")
    except Exception as e:
        print(f"  Amazon '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── Flipkart Minutes Scraper ───────────────────────────────────────────────────
async def scrape_flipkart(context: BrowserContext, query: str) -> list:
    """
    Scrape Flipkart Minutes grocery search via DOM + intercepted JSON.
    """
    page = await context.new_page()
    results = []
    captured = []

    async def on_response(response):
        url = response.url
        if ("flipkart.com" in url and response.status == 200 and
                "api/4/page/fetch" in url):
            ct = response.headers.get("content-type", "")
            if "json" in ct:
                try:
                    data = await response.json()
                    captured.append(data)
                except Exception:
                    pass

    page.on("response", on_response)

    try:
        await page.goto(
            f"https://www.flipkart.com/search?q={query}&marketplace=GROCERY",
            wait_until="networkidle",
            timeout=35000,
        )
        await asyncio.sleep(3)

        # Parse intercepted JSON responses
        for data in captured:
            try:
                slots = (
                    data.get("pageData", {}).get("slots", [])
                    or data.get("slots", [])
                    or []
                )
                for slot in slots:
                    widget_data = slot.get("widget", {}).get("data", {}) or {}
                    products_raw = (
                        widget_data.get("products", [])
                        or widget_data.get("productSearchResult", {}).get("products", [])
                        or []
                    )
                    for prod in products_raw:
                        listing = prod.get("productInfo", {}).get("value", {}) or prod
                        name = (
                            listing.get("title", "")
                            or listing.get("titleInfo", {}).get("title", "")
                        )
                        pricing = listing.get("pricing", {}) or {}
                        mrp_val = pricing.get("mrp", {}).get("value", 0) or 0
                        price_val = pricing.get("finalPrice", {}).get("value", 0) or mrp_val
                        images = listing.get("media", {}).get("images", []) or []
                        img = images[0].get("url", "") if images else ""
                        if name and price_val > 0:
                            results.append({
                                "platform": "flipkart",
                                "name": str(name)[:200],
                                "price": float(price_val),
                                "mrp": float(mrp_val) if mrp_val >= price_val else float(price_val),
                                "image_url": img,
                                "unit": listing.get("subtitle", ""),
                                "in_stock": not listing.get("availability", {}).get("isOutOfStock", False),
                                "query": query,
                            })
            except Exception:
                pass

        # Fallback: DOM scraping if JSON interception yielded nothing
        if not results:
            products = await page.evaluate(
                """() => {
                    const out = [];
                    document.querySelectorAll('._1AtVbE, ._13oc-S, [data-id]').forEach(card => {
                        try {
                            const name = card.querySelector('._4rR01T, .s1Q9rs, ._2WkVRV')?.textContent?.trim()
                                      || card.querySelector('a[title]')?.getAttribute('title');
                            const price = card.querySelector('._30jeq3, ._1_WHN1')?.textContent?.replace(/[^0-9.]/g,'');
                            const mrp = card.querySelector('._3I9_wc, ._27UcVY')?.textContent?.replace(/[^0-9.]/g,'');
                            const img = card.querySelector('img._396cs4, img._2r_T1I')?.src || '';
                            if (name && price && parseFloat(price) > 0)
                                out.push({name, price: parseFloat(price), mrp: mrp ? parseFloat(mrp) : null, image_url: img});
                        } catch(e) {}
                    });
                    return out;
                }"""
            )
            for p in products[:25]:
                if p.get("name") and p.get("price"):
                    price = float(p["price"])
                    mrp = float(p["mrp"]) if p.get("mrp") else price
                    results.append({
                        "platform": "flipkart",
                        "name": p["name"][:200],
                        "price": price,
                        "mrp": mrp if mrp >= price else price,
                        "image_url": p.get("image_url", ""),
                        "unit": "",
                        "in_stock": True,
                        "query": query,
                    })

        print(f"  Flipkart '{query}': {len(results)} products")
    except Exception as e:
        print(f"  Flipkart '{query}' error: {e}")
    finally:
        await page.close()

    return results


# ── Query → Category mapping ──────────────────────────────────────────────────
QUERY_CATEGORY_MAP = {
    # Dairy & Breakfast
    "milk": "dairy-breakfast", "butter": "dairy-breakfast", "eggs": "dairy-breakfast",
    "yogurt curd": "dairy-breakfast", "cheese": "dairy-breakfast", "paneer": "dairy-breakfast",
    "cream": "dairy-breakfast", "cornflakes cereal": "dairy-breakfast", "oats": "dairy-breakfast",
    "muesli": "dairy-breakfast",
    # Staples
    "rice": "staples", "atta wheat flour": "staples", "sugar": "staples", "salt": "staples",
    "dal lentils": "staples", "chana dal": "staples", "urad dal": "staples",
    "moong dal": "staples", "poha": "staples", "suji semolina": "staples",
    "besan gram flour": "staples", "rajma kidney beans": "staples",
    # Oils & Spices
    "cooking oil": "oils-spices", "ghee": "oils-spices", "mustard oil": "oils-spices",
    "olive oil": "oils-spices", "honey": "oils-spices", "turmeric haldi": "oils-spices",
    "cumin jeera": "oils-spices", "coriander powder dhania": "oils-spices",
    "garam masala": "oils-spices", "red chilli powder": "oils-spices",
    "black pepper": "oils-spices",
    # Fruits & Vegetables
    "tomato": "fruits-vegetables", "onion": "fruits-vegetables", "potato": "fruits-vegetables",
    "banana": "fruits-vegetables", "apple": "fruits-vegetables", "spinach palak": "fruits-vegetables",
    "capsicum shimla mirch": "fruits-vegetables", "carrot gajar": "fruits-vegetables",
    "cucumber kheera": "fruits-vegetables", "garlic lehsun": "fruits-vegetables",
    "ginger adrak": "fruits-vegetables", "green chilli": "fruits-vegetables",
    "coriander dhania leaves": "fruits-vegetables", "pineapple": "fruits-vegetables",
    "watermelon": "fruits-vegetables", "grapes": "fruits-vegetables",
    "pomegranate anaar": "fruits-vegetables", "cauliflower": "fruits-vegetables",
    "brinjal baingan": "fruits-vegetables", "bhindi lady finger": "fruits-vegetables",
    "methi fenugreek": "fruits-vegetables", "peas matar": "fruits-vegetables",
    "radish mooli": "fruits-vegetables", "lemon nimbu": "fruits-vegetables",
    # Snacks & Drinks
    "biscuits": "snacks-drinks", "chips": "snacks-drinks", "noodles": "snacks-drinks",
    "cold drink cola": "snacks-drinks", "mango juice": "snacks-drinks",
    "energy drink": "snacks-drinks", "nachos": "snacks-drinks", "popcorn": "snacks-drinks",
    "namkeen mixture": "snacks-drinks", "dry fruits": "snacks-drinks",
    "cashew nuts": "snacks-drinks", "almonds": "snacks-drinks", "peanuts": "snacks-drinks",
    "chocolate": "snacks-drinks", "candy": "snacks-drinks",
    # Bakery
    "bread": "bakery", "pav bun": "bakery", "cake rusk": "bakery",
    # Personal Care
    "soap": "personal-care", "shampoo": "personal-care", "toothpaste": "personal-care",
    "body lotion": "personal-care", "face wash": "personal-care", "face cream": "personal-care",
    "deodorant": "personal-care", "razor": "personal-care", "baby powder": "personal-care",
    "sunscreen": "personal-care", "lip balm": "personal-care", "hand wash": "personal-care",
    # Household
    "detergent": "household", "dishwash bar": "household", "floor cleaner": "household",
    "toilet cleaner": "household", "antiseptic liquid dettol": "household",
    "scrub pad": "household", "air freshener": "household",
    "mosquito repellent": "household", "garbage bags": "household", "tissue paper": "household",
    # Beverages (map to snacks-drinks)
    "tea": "snacks-drinks", "coffee": "snacks-drinks", "green tea": "snacks-drinks",
    "protein shake": "snacks-drinks",
    # Chicken & Meat
    "chicken breast boneless": "chicken-meat", "chicken curry cut": "chicken-meat",
    "mutton keema": "chicken-meat", "chicken wings": "chicken-meat",
    # Frozen Foods
    "frozen peas": "frozen-foods", "french fries frozen": "frozen-foods",
    "ice cream": "frozen-foods", "frozen corn": "frozen-foods",
    "frozen vegetables mix": "frozen-foods",
    # Baby Care
    "diapers pampers": "baby-care", "baby food cerelac": "baby-care",
    "baby shampoo johnson": "baby-care", "baby oil": "baby-care",
    # Pet Care
    "dog food pedigree": "pet-care", "cat food whiskas": "pet-care", "pet treats": "pet-care",
}


# ── DB Save ───────────────────────────────────────────────────────────────────
async def save_to_db(all_results: list):
    """Save scraped data to PostgreSQL using raw asyncpg (Python 3.9 compatible)."""
    try:
        from dotenv import load_dotenv

        for ep in [
            os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
        ]:
            if os.path.exists(ep):
                load_dotenv(ep)
                break

        db_url = os.environ.get("DATABASE_URL", "")
        if not db_url:
            print("  ⚠️  No DATABASE_URL — data saved to /tmp/scraped_data.json only")
            return

        # Convert SQLAlchemy URL to plain asyncpg DSN
        dsn = db_url
        for prefix in ["postgresql+asyncpg://", "postgresql+psycopg2://"]:
            if dsn.startswith(prefix):
                dsn = "postgresql://" + dsn[len(prefix):]
        if dsn.startswith("postgres://"):
            dsn = "postgresql://" + dsn[len("postgres://"):]

        import asyncpg

        conn = await asyncpg.connect(dsn)
        try:
            # Load platforms: slug → id
            rows = await conn.fetch("SELECT id, slug FROM platforms")
            platforms = {r["slug"]: str(r["id"]) for r in rows}
            print(f"  Found platforms in DB: {list(platforms.keys())}")

            # Load categories: slug → id
            rows = await conn.fetch("SELECT id, slug FROM categories")
            cat_map = {r["slug"]: str(r["id"]) for r in rows}

            fallback_cat_id = (
                cat_map.get("staples")
                or cat_map.get("dairy-breakfast")
                or list(cat_map.values())[0]
            )

            saved = 0
            new_products = 0
            now = datetime.now(timezone.utc)

            for item in all_results:
                plat_id = platforms.get(item["platform"])
                if not plat_id:
                    continue

                name = item["name"][:200]
                slug_val = slugify(name)[:100]
                query = item.get("query", "")
                cat_slug = QUERY_CATEGORY_MAP.get(query, "")
                cat_id = cat_map.get(cat_slug) or fallback_cat_id

                # Upsert product
                existing = await conn.fetchrow(
                    "SELECT id, category_id FROM products WHERE slug = $1", slug_val
                )
                if existing:
                    prod_id = str(existing["id"])
                    if str(existing["category_id"]) != cat_id:
                        await conn.execute(
                            "UPDATE products SET category_id = $1 WHERE id = $2",
                            uuid.UUID(cat_id), uuid.UUID(prod_id)
                        )
                else:
                    prod_id = str(uuid.uuid4())
                    await conn.execute(
                        """INSERT INTO products (id, name, slug, category_id, image_url,
                           is_active, is_featured, created_at, updated_at)
                           VALUES ($1,$2,$3,$4,$5,true,true,$6,$6)""",
                        uuid.UUID(prod_id), name, slug_val, uuid.UUID(cat_id),
                        item.get("image_url") or "", now
                    )
                    new_products += 1

                # Upsert platform_price
                price = float(item["price"])
                mrp = float(item.get("mrp") or price)
                is_available = bool(item.get("in_stock", True))

                existing_pp = await conn.fetchrow(
                    "SELECT id FROM platform_prices WHERE product_id=$1 AND platform_id=$2",
                    uuid.UUID(prod_id), uuid.UUID(plat_id)
                )
                if existing_pp:
                    await conn.execute(
                        """UPDATE platform_prices SET price=$1, original_price=$2,
                           is_available=$3, last_updated=$4
                           WHERE product_id=$5 AND platform_id=$6""",
                        price, mrp, is_available, now,
                        uuid.UUID(prod_id), uuid.UUID(plat_id)
                    )
                else:
                    await conn.execute(
                        """INSERT INTO platform_prices
                           (id, product_id, platform_id, price, original_price,
                            is_available, last_updated)
                           VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                        uuid.uuid4(), uuid.UUID(prod_id), uuid.UUID(plat_id),
                        price, mrp, is_available, now
                    )
                saved += 1

                if saved % 500 == 0:
                    print(f"  ... {saved} saved so far ({new_products} new products)")

            print(f"  ✅ Saved {saved} prices to database ({new_products} new products)")

            # Print summary
            total_products = await conn.fetchval("SELECT COUNT(*) FROM products")
            total_prices = await conn.fetchval("SELECT COUNT(*) FROM platform_prices")
            print(f"\n{'═'*52}")
            print(f"  Total products  : {total_products}")
            print(f"  Total price rows: {total_prices}")
            rows = await conn.fetch("""
                SELECT c.name, COUNT(p.id) as cnt
                FROM categories c LEFT JOIN products p ON p.category_id = c.id
                GROUP BY c.name ORDER BY cnt DESC
            """)
            print("  Products per category:")
            for r in rows:
                status = "✅" if r["cnt"] > 0 else "❌"
                print(f"  {status} {r['name']:<28} {r['cnt']:>4}")
            rows = await conn.fetch("""
                SELECT pl.name, COUNT(pp.id) as cnt
                FROM platforms pl LEFT JOIN platform_prices pp ON pp.platform_id = pl.id
                GROUP BY pl.name ORDER BY cnt DESC
            """)
            print("  Price rows per platform:")
            for r in rows:
                status = "✅" if r["cnt"] > 0 else "❌"
                print(f"  {status} {r['name']:<28} {r['cnt']:>4}")
            print(f"{'═'*52}")

        finally:
            await conn.close()

    except Exception as e:
        print(f"  ❌ DB error: {e}")
        import traceback
        traceback.print_exc()


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    print("\n" + "═" * 60)
    print("🛒 PriceBasket Real Data Scraper (Playwright)")
    print("═" * 60)
    print(f"Location: {CITY} ({LAT}, {LON})")
    print(f"Queries: {len(SEARCH_QUERIES)}")
    print("═" * 60)

    all_results = []

    async with async_playwright() as p:
        # ── Blinkit ───────────────────────────────────────────────────────────
        print("\n📦 BLINKIT")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
            geolocation={"latitude": LAT, "longitude": LON},
            permissions=["geolocation"],
        )
        warmup = await context.new_page()
        await warmup.goto("https://blinkit.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await warmup.close()

        for query in SEARCH_QUERIES:
            results = await scrape_blinkit(context, query)
            all_results.extend(results)
            await asyncio.sleep(1)

        await browser.close()

        # ── Zepto ─────────────────────────────────────────────────────────────
        print("\n⚡ ZEPTO")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="en-IN",
            geolocation={"latitude": LAT, "longitude": LON},
            permissions=["geolocation"],
        )
        warmup = await context.new_page()
        await warmup.goto("https://www.zeptonow.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await warmup.close()

        for query in SEARCH_QUERIES:
            results = await scrape_zepto(context, query)
            all_results.extend(results)
            await asyncio.sleep(1)

        await browser.close()

        # ── Instamart ─────────────────────────────────────────────────────────
        print("\n🟠 INSTAMART")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="en-IN",
            geolocation={"latitude": LAT, "longitude": LON},
            permissions=["geolocation"],
        )
        warmup = await context.new_page()
        await warmup.goto("https://www.swiggy.com/instamart", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await warmup.close()

        for query in SEARCH_QUERIES:
            results = await scrape_instamart(context, query)
            all_results.extend(results)
            await asyncio.sleep(1)

        await browser.close()

        # ── BigBasket ─────────────────────────────────────────────────────────
        print("\n🟢 BIGBASKET")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
        )
        warmup = await context.new_page()
        await warmup.goto("https://www.bigbasket.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await warmup.close()

        for query in SEARCH_QUERIES:
            results = await scrape_bigbasket(context, query)
            all_results.extend(results)
            await asyncio.sleep(1)

        await browser.close()

        # ── JioMart ───────────────────────────────────────────────────────────
        print("\n🔵 JIOMART")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
        )
        for query in SEARCH_QUERIES:
            results = await scrape_jiomart(context, query)
            all_results.extend(results)
            await asyncio.sleep(1)

        await browser.close()

        # ── Amazon Fresh ──────────────────────────────────────────────────────
        print("\n🟡 AMAZON FRESH")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
            extra_http_headers={
                "Accept-Language": "en-IN,en;q=0.9",
            },
        )
        warmup = await context.new_page()
        await warmup.goto("https://www.amazon.in/amazonfresh", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await warmup.close()

        for query in SEARCH_QUERIES:
            results = await scrape_amazon(context, query)
            all_results.extend(results)
            await asyncio.sleep(1.5)

        await browser.close()

        # ── Flipkart Minutes ──────────────────────────────────────────────────
        print("\n🔷 FLIPKART MINUTES")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
            extra_http_headers={
                "X-User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 "
                    "FKUA/website/42/website/Desktop"
                ),
            },
        )
        warmup = await context.new_page()
        await warmup.goto("https://www.flipkart.com/grocery-supermart", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await warmup.close()

        for query in SEARCH_QUERIES:
            results = await scrape_flipkart(context, query)
            all_results.extend(results)
            await asyncio.sleep(1.5)

        await browser.close()

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("SCRAPING SUMMARY")
    print("═" * 60)
    by_platform: dict = {}
    for r in all_results:
        by_platform[r["platform"]] = by_platform.get(r["platform"], 0) + 1

    for platform, count in sorted(by_platform.items()):
        print(f"  {platform}: {count} products")
    print(f"  TOTAL: {len(all_results)} products")

    # Save JSON
    with open("/tmp/scraped_data.json", "w") as f:
        json.dump(all_results, f, indent=2)
    print("\n  Raw data saved to /tmp/scraped_data.json")

    # Show samples
    if all_results:
        print("\n  Sample products:")
        seen_platforms: set = set()
        for r in all_results:
            if r["platform"] not in seen_platforms:
                seen_platforms.add(r["platform"])
                print(f"  [{r['platform']}] {r['name']} - ₹{r['price']} ({r['unit']})")

    # Save to DB
    if all_results:
        print("\n💾 Saving to database...")
        await save_to_db(all_results)
    else:
        print("\n⚠️  No data scraped!")

    print("\n✅ Done!")


if __name__ == "__main__":
    asyncio.run(main())
