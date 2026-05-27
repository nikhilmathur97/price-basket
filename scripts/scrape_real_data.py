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
    "milk",
    "bread",
    "eggs",
    "butter",
    "rice",
    "atta wheat flour",
    "sugar",
    "salt",
    "cooking oil",
    "dal lentils",
    "tomato",
    "onion",
    "potato",
    "banana",
    "apple",
    "yogurt curd",
    "cheese",
    "paneer",
    "tea",
    "coffee",
    "biscuits",
    "chips",
    "noodles",
    "soap",
    "shampoo",
    "toothpaste",
    "detergent",
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


# ── DB Save ───────────────────────────────────────────────────────────────────
async def save_to_db(all_results: list):
    """Save scraped data to the PostgreSQL database."""
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

        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import select

        from backend.app.models.product import Product, Category
        from backend.app.models.platform import Platform
        from backend.app.models.price import PlatformPrice

        engine = create_async_engine(db_url, echo=False)
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with AsyncSessionLocal() as db:
            platforms = {}
            for slug in ["blinkit", "zepto", "instamart", "bigbasket", "jiomart"]:
                res = await db.execute(select(Platform).where(Platform.slug == slug))
                p = res.scalar_one_or_none()
                if p:
                    platforms[slug] = p

            print(f"  Found platforms in DB: {list(platforms.keys())}")

            res = await db.execute(select(Category).where(Category.slug == "groceries"))
            category = res.scalar_one_or_none()
            if not category:
                category = Category(id=uuid.uuid4(), name="Groceries", slug="groceries", icon="🛒")
                db.add(category)
                await db.flush()

            saved = 0
            for item in all_results:
                platform = platforms.get(item["platform"])
                if not platform:
                    continue

                name = item["name"][:200]
                slug = slugify(name)[:100]

                res = await db.execute(select(Product).where(Product.slug == slug))
                product = res.scalar_one_or_none()
                if not product:
                    product = Product(
                        id=uuid.uuid4(),
                        name=name,
                        slug=slug,
                        category_id=category.id,
                        image_url=item.get("image_url", ""),
                        is_active=True,
                        is_featured=True,
                    )
                    db.add(product)
                    await db.flush()

                res = await db.execute(
                    select(PlatformPrice).where(
                        PlatformPrice.product_id == product.id,
                        PlatformPrice.platform_id == platform.id,
                    )
                )
                pp = res.scalar_one_or_none()
                now = datetime.now(timezone.utc)
                if pp:
                    pp.price = item["price"]
                    pp.original_price = item.get("mrp", item["price"])
                    pp.in_stock = item.get("in_stock", True)
                    pp.last_updated = now
                else:
                    pp = PlatformPrice(
                        id=uuid.uuid4(),
                        product_id=product.id,
                        platform_id=platform.id,
                        price=item["price"],
                        original_price=item.get("mrp", item["price"]),
                        in_stock=item.get("in_stock", True),
                        last_updated=now,
                    )
                    db.add(pp)
                saved += 1

            await db.commit()
            print(f"  ✅ Saved {saved} prices to database")

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
