"""
PriceBasket — Master Seed + Scrape Script
==========================================
One command to populate the entire database with real product data and live prices.

Steps:
  1. Seed 9 platforms   (Blinkit, Zepto, BigBasket, Instamart, Amazon, Flipkart, JioMart, Myntra, Nykaa)
  2. Seed 12 categories
  3. Scrape Blinkit for 250+ products across all categories  (primary product source)
  4. Concurrently scrape every other platform for cross-platform prices
  5. Upsert everything into PostgreSQL

Usage:
    cd price-basket
    python scripts/seed_and_scrape_all.py

Env vars (same as backend .env):
    DATABASE_URL   BLINKIT_LAT   BLINKIT_LON
"""

import asyncio
import os
import re
import sys
import time
import uuid
from typing import Optional
from urllib.parse import quote_plus

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.product import Category, Product
from app.models.platform import Platform
from app.models.price import PlatformPrice

# ── Location (Delhi NCR — best coverage across all platforms) ────────────────
LAT = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
LON = str(getattr(settings, "BLINKIT_LON", "77.2090"))

# ── Platform definitions ─────────────────────────────────────────────────────
PLATFORMS = [
    dict(slug="blinkit",   name="Blinkit",         color_hex="#F8C920",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/2/2f/Blinkit-yellow-app-icon.svg",
         avg_delivery_minutes=10, min_order_amount=0,   delivery_fee=25,  free_delivery_threshold=199,
         scraping_enabled=True),
    dict(slug="zepto",     name="Zepto",            color_hex="#8B5CF6",
         logo_url="https://play-lh.googleusercontent.com/WGRtFg-eaXkSFlHmHiGXP95X4Ixq2_n5OkLFTjBmXvjU2tP7KnMAtE1oeP7tB9c-Xg=w240-h480",
         avg_delivery_minutes=10, min_order_amount=0,   delivery_fee=20,  free_delivery_threshold=149,
         scraping_enabled=True),
    dict(slug="bigbasket", name="BB Now",           color_hex="#84CC16",
         logo_url="https://play-lh.googleusercontent.com/fPaJ7nEVE0jHMG0qdibOt32RBf51dC5-W6sAj4slVxUqCPAiuC7IhH4yPc5W0Bm0XA=w240-h480",
         avg_delivery_minutes=30, min_order_amount=200, delivery_fee=40,  free_delivery_threshold=500,
         scraping_enabled=True),
    dict(slug="instamart", name="Swiggy Instamart", color_hex="#FF6600",
         logo_url="https://play-lh.googleusercontent.com/n0PBTbEAp4FoLnVJzJnlVAL0U1O3R5N4R7IrjTnZIwikGjqX8VzKrDv7cExhSJtd5Q=w240-h480",
         avg_delivery_minutes=15, min_order_amount=0,   delivery_fee=30,  free_delivery_threshold=299,
         scraping_enabled=True),
    dict(slug="amazon",    name="Amazon Fresh",     color_hex="#FF9900",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
         avg_delivery_minutes=120, min_order_amount=0,  delivery_fee=0,   free_delivery_threshold=499,
         scraping_enabled=True),
    dict(slug="flipkart",  name="Flipkart Minutes", color_hex="#2874F0",
         logo_url="https://upload.wikimedia.org/wikipedia/en/1/1b/NowFloats-Boost_Flipkart_logo.png",
         avg_delivery_minutes=10, min_order_amount=0,   delivery_fee=25,  free_delivery_threshold=199,
         scraping_enabled=True),
    dict(slug="jiomart",   name="JioMart",          color_hex="#0066CC",
         logo_url="https://upload.wikimedia.org/wikipedia/en/3/38/JioMart_Logo.png",
         avg_delivery_minutes=30, min_order_amount=0,   delivery_fee=0,   free_delivery_threshold=0,
         scraping_enabled=True),
    dict(slug="myntra",    name="Myntra",           color_hex="#FF3F6C",
         logo_url="https://aartisto.com/wp-content/uploads/2020/01/myntra.png",
         avg_delivery_minutes=1440, min_order_amount=0, delivery_fee=0,   free_delivery_threshold=999,
         scraping_enabled=False),
    dict(slug="nykaa",     name="Nykaa",            color_hex="#FC2779",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/a/a1/Nykaa_Logo.png",
         avg_delivery_minutes=1440, min_order_amount=0, delivery_fee=0,   free_delivery_threshold=499,
         scraping_enabled=False),
]

# ── Category definitions ─────────────────────────────────────────────────────
FOOD_IMG = {
    "spinach":    "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop",
    "milk":       "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
    "chips":      "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop",
    "bread":      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    "detergent":  "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop",
    "shampoo":    "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&h=400&fit=crop",
    "chicken":    "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop",
    "flour":      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop",
    "oil":        "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop",
    "baby":       "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    "pet":        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    "ice":        "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=400&h=400&fit=crop",
}

CATEGORIES = [
    dict(slug="fruits-vegetables", name="Fruits & Vegetables", icon="🥦", display_order=1,  image_url=FOOD_IMG["spinach"]),
    dict(slug="dairy-breakfast",   name="Dairy & Breakfast",   icon="🥛", display_order=2,  image_url=FOOD_IMG["milk"]),
    dict(slug="snacks-drinks",     name="Snacks & Drinks",     icon="🍿", display_order=3,  image_url=FOOD_IMG["chips"]),
    dict(slug="bakery",            name="Bakery & Biscuits",   icon="🍞", display_order=4,  image_url=FOOD_IMG["bread"]),
    dict(slug="household",         name="Household",           icon="🧹", display_order=5,  image_url=FOOD_IMG["detergent"]),
    dict(slug="personal-care",     name="Personal Care",       icon="🧴", display_order=6,  image_url=FOOD_IMG["shampoo"]),
    dict(slug="chicken-meat",      name="Chicken & Meat",      icon="🍗", display_order=7,  image_url=FOOD_IMG["chicken"]),
    dict(slug="frozen-foods",      name="Frozen Foods",        icon="🧊", display_order=8,  image_url=FOOD_IMG["ice"]),
    dict(slug="baby-care",         name="Baby Care",           icon="👶", display_order=9,  image_url=FOOD_IMG["baby"]),
    dict(slug="pet-care",          name="Pet Care",            icon="🐾", display_order=10, image_url=FOOD_IMG["pet"]),
    dict(slug="staples",           name="Atta, Rice & Dal",    icon="🌾", display_order=11, image_url=FOOD_IMG["flour"]),
    dict(slug="oils-spices",       name="Oils & Spices",       icon="🫙", display_order=12, image_url=FOOD_IMG["oil"]),
]

# ── Blinkit search queries per category ──────────────────────────────────────
BLINKIT_QUERIES = [
    ("fruits-vegetables", [
        "fresh onion", "tomato", "banana", "spinach palak", "apple shimla",
        "potato aloo", "lemon nimbu", "capsicum shimla mirch", "carrot gajar",
        "cucumber kheera", "garlic lehsun", "ginger adrak", "green chilli",
        "coriander dhania", "pineapple", "watermelon", "grapes", "pomegranate anaar",
        "cauliflower", "brinjal baingan", "bitter gourd karela", "lady finger bhindi",
        "methi fenugreek", "peas matar", "radish mooli",
    ]),
    ("dairy-breakfast", [
        "amul gold milk 1l", "amul butter 500g", "mother dairy curd 400g",
        "country delight eggs 12", "amul paneer 200g", "amul cheese slice",
        "epigamia greek yogurt", "mother dairy milk", "nandini milk",
        "go cheese", "britannia cheese", "verka butter",
        "haldirams namkeen", "kellogg cornflakes", "muesli oats",
    ]),
    ("snacks-drinks", [
        "lays magic masala chips", "kurkure masala munch", "haldirams aloo bhujia",
        "coca cola cold drink", "pepsi 2l", "7up sprite cold drink",
        "red bull energy drink", "tropicana juice", "real mango juice",
        "parle g biscuit", "britannia good day", "oreo biscuit",
        "doritos nachos chips", "uncle chips spicy", "pringles sour cream",
        "mango slice drink", "frooti mango drink", "maaza mango",
        "mountain dew", "thums up cold drink",
    ]),
    ("bakery", [
        "harvest gold white bread", "britannia 5050 biscuit", "oreo cream biscuit",
        "mcvities digestive biscuit", "parle hide seek", "sunfeast marie biscuit",
        "britannia bourbon biscuit", "cream roll bread", "pav bun",
        "cake rusk", "good day cashew biscuit",
    ]),
    ("staples", [
        "aashirvaad whole wheat atta 5kg", "india gate basmati rice",
        "tata sampann toor dal", "fortune sunflower oil 1l",
        "chana dal 1kg", "urad dal 1kg", "moong dal 500g",
        "poha chivda", "suji rava semolina", "besan gram flour",
        "rajma kidney beans", "kabuli chana chickpeas", "sona masoori rice",
        "daawat basmati rice", "shakti bhog atta",
    ]),
    ("oils-spices", [
        "fortune sunflower cooking oil", "saffola gold oil 1l", "dabur pure honey",
        "mdh kitchen king masala", "everest red chilli powder",
        "organic india turmeric haldi", "cumin seeds jeera",
        "coriander powder dhania", "garam masala blend",
        "tata salt namak 1kg", "catch black pepper", "mustard oil sarson",
        "olive oil extra virgin", "ghee amul 500g", "coconut oil parachute",
    ]),
    ("household", [
        "vim dishwash bar", "surf excel easy wash detergent",
        "harpic power plus toilet cleaner", "lizol floor cleaner",
        "dettol antiseptic liquid 500ml", "ariel detergent powder 2kg",
        "scotch brite scrub pad", "pril dishwash liquid",
        "colgate maxfresh toothpaste", "odonil air freshener",
        "hit cockroach spray", "baygon mosquito spray", "phenyl cleaner",
        "moppe floor cleaner", "domex disinfectant",
    ]),
    ("personal-care", [
        "dove moisturising beauty soap", "head shoulders anti dandruff shampoo",
        "colgate maxfresh toothpaste 150g", "nivea body lotion 200ml",
        "dettol antibacterial soap bar", "ponds face cream 50g",
        "vaseline petroleum jelly 250ml", "himalaya neem face wash",
        "pantene silky smooth shampoo", "garnier face wash",
        "gillette mach3 razor", "old spice deodorant",
        "johnson baby powder", "lakme sunscreen spf",
        "biotique face cream", "cetaphil moisturiser",
    ]),
    ("chicken-meat", [
        "licious fresh chicken breast boneless 500g", "licious chicken curry cut 1kg",
        "country delight brown eggs 6pcs", "licious mutton keema 500g",
        "fresh chicken leg piece 1kg", "raw chicken whole",
        "licious chicken wings", "venky chicken nuggets frozen",
    ]),
    ("frozen-foods", [
        "mccain french fries frozen 400g", "sumeru frozen green peas",
        "mother dairy frozen mix vegetables", "amul ice cream cone",
        "kwality walls cornetto icecream", "igloo ice cream brick",
        "vadilal ice cream tub", "frozen corn niblets",
        "mccain smiles potato", "venky chicken nuggets",
    ]),
    ("baby-care", [
        "pampers pants diapers size 4", "huggies dry diapers",
        "johnsons baby shampoo 200ml", "nestle cerelac wheat baby food",
        "nestum rice baby cereal", "mamy poko pants diapers",
        "johnson baby oil", "johnson baby lotion",
    ]),
    ("pet-care", [
        "pedigree adult dog food", "drools dog food chicken",
        "whiskas adult cat food", "royal canin dog food",
        "chappi dog food mutton", "pedigree puppy dog food",
    ]),
]

# ── Utility ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:200]


def build_image_url(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    name = raw.lstrip("/")
    if name.startswith("rsku_image/products_main/"):
        return f"https://cdn.blinkit.com/{name}"
    return f"https://cdn.blinkit.com/rsku_image/products_main/{name}"


# ── Blinkit scraping ─────────────────────────────────────────────────────────

BLINKIT_BASE  = "https://blinkit.com"
BLINKIT_SEARCH = "https://blinkit.com/v6/listing/products"
BLINKIT_DELIVERY = 10

USER_AGENTS = [
    ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
    ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"),
    ("Mozilla/5.0 (X11; Linux x86_64) "
     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
]


def blinkit_headers(query: str, idx: int = 0) -> dict:
    return {
        "app_client":        "consumer_web",
        "lat":               LAT,
        "lon":               LON,
        "rn_bundle_version": "1000033",
        "web-version":       "2024120401",
        "Accept":            "application/json, text/plain, */*",
        "Accept-Language":   "en-IN,en;q=0.9,hi;q=0.8",
        "Accept-Encoding":   "gzip, deflate, br",
        "Origin":            BLINKIT_BASE,
        "Referer":           f"{BLINKIT_BASE}/search?q={quote_plus(query)}",
        "User-Agent":        USER_AGENTS[idx % len(USER_AGENTS)],
        "sec-ch-ua":         '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile":  "?0",
        "sec-ch-ua-platform": '"macOS"',
        "Sec-Fetch-Dest":    "empty",
        "Sec-Fetch-Mode":    "cors",
        "Sec-Fetch-Site":    "same-origin",
    }


async def fetch_blinkit(client: httpx.AsyncClient, query: str, attempt: int = 0) -> list[dict]:
    """Search Blinkit v6 API, return list of raw product dicts."""
    for retry in range(3):
        try:
            resp = await client.get(
                BLINKIT_SEARCH,
                params={"q": query, "start": 0, "limit": 20, "search_type": 8},
                headers=blinkit_headers(query, attempt + retry),
                timeout=20.0,
            )
            resp.raise_for_status()
            data = resp.json()

            products: list[dict] = []

            # Shape 1: objects array with PRODUCT type
            for obj in data.get("objects") or []:
                if isinstance(obj, dict) and obj.get("type") == "PRODUCT" and "data" in obj:
                    products.append(obj["data"])

            # Shape 2: flat list
            if not products and isinstance(data, list):
                products = data

            # Shape 3: products/results key
            if not products:
                products = data.get("products") or data.get("results") or []

            return products

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                wait = 2 ** retry * 2
                print(f"    ⏳ Rate limited for '{query}', waiting {wait}s…")
                await asyncio.sleep(wait)
            else:
                print(f"    ⚠  HTTP {e.response.status_code} for '{query}'")
                return []
        except Exception as e:
            if retry < 2:
                await asyncio.sleep(1 + retry)
            else:
                print(f"    ⚠  Error for '{query}': {type(e).__name__}: {e}")
                return []

    return []


def parse_blinkit_product(raw: dict, category_slug: str) -> Optional[dict]:
    price = float(raw.get("price") or 0)
    mrp   = float(raw.get("mrp")   or price)
    if price <= 0 and mrp <= 0:
        return None
    if price <= 0:
        price = mrp

    in_stock = bool(raw.get("in_stock") or raw.get("available") or raw.get("is_in_stock"))

    raw_imgs = raw.get("images") or []
    if raw_imgs:
        first = raw_imgs[0]
        raw_img = (
            first.get("name") or first.get("url")
            or (first if isinstance(first, str) else None)
        )
    else:
        raw_img = raw.get("image_url") or raw.get("thumbnail")
    image_url = build_image_url(raw_img)

    name  = (raw.get("name") or raw.get("product_name") or "").strip()
    brand = (raw.get("brand") or raw.get("brand_name") or "").strip()
    unit  = (raw.get("unit") or raw.get("quantity") or raw.get("variant_name") or "").strip()
    pid   = str(raw.get("id") or raw.get("product_id") or raw.get("variant_id") or "")
    slug_src = raw.get("slug") or pid or name
    slug  = slugify(slug_src)

    if not name or not slug:
        return None

    discount = round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0
    url = f"{BLINKIT_BASE}/prn/{raw.get('slug') or pid}" if (raw.get("slug") or pid) else None

    return {
        "blinkit_pid": pid,
        "name":         name,
        "brand":        brand or None,
        "unit":         unit or None,
        "slug":         slug,
        "category_slug": category_slug,
        "image_url":    image_url,
        "price":        price,
        "mrp":          mrp,
        "discount_percent": discount,
        "is_available": in_stock,
        "product_url":  url,
        "tags":         [t.lower() for t in [name, brand, category_slug, unit] if t],
    }


# ── Zepto scraping ───────────────────────────────────────────────────────────

ZEPTO_SEARCH = "https://api.zeptonow.com/api/v3/search"
ZEPTO_DELIVERY = 10

# Delhi NCR store IDs to try (Zepto uses location-specific stores)
ZEPTO_STORE_IDS = ["1", "72", "101", "145"]


async def fetch_zepto(client: httpx.AsyncClient, query: str) -> Optional[dict]:
    for store_id in ZEPTO_STORE_IDS:
        try:
            resp = await client.post(
                ZEPTO_SEARCH,
                json={
                    "query": query,
                    "pageNumber": 0,
                    "pageSize": 5,
                    "mode": "PRODUCT_SEARCH",
                    "currPage": 0,
                },
                headers={
                    "x-app-version":    "11.20.3",
                    "x-platform":       "WEB",
                    "store_id":         store_id,
                    "x-store-id":       store_id,
                    "Content-Type":     "application/json",
                    "Accept":           "application/json",
                    "Origin":           "https://www.zeptonow.com",
                    "Referer":          f"https://www.zeptonow.com/search?query={quote_plus(query)}",
                    "User-Agent":       USER_AGENTS[0],
                },
                timeout=12.0,
            )
            resp.raise_for_status()
            data = resp.json()

            items = (
                data.get("items")
                or data.get("data", {}).get("items")
                or data.get("results")
                or []
            )
            for raw in items:
                candidate = raw.get("productResponse") or raw.get("product") or raw
                mrp_p   = candidate.get("mrp") or candidate.get("marketPrice") or 0
                price_p = candidate.get("price") or candidate.get("discountedPrice") or mrp_p
                mrp   = float(mrp_p)   / 100
                price = float(price_p) / 100
                if price <= 0:
                    continue

                in_stock   = bool(candidate.get("inventoryAvailable", candidate.get("available", True)))
                product_id = str(candidate.get("productId") or candidate.get("id") or "")

                return {
                    "price":        price,
                    "mrp":          mrp if mrp > price else price,
                    "discount_pct": round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
                    "is_available": in_stock,
                    "pid":          product_id,
                    "url":          f"https://www.zeptonow.com/product/{product_id}" if product_id else None,
                    "image_url":    candidate.get("imgUrl") or candidate.get("image_url"),
                    "delivery_mins": ZEPTO_DELIVERY,
                }
        except Exception:
            continue
    return None


# ── BigBasket scraping ───────────────────────────────────────────────────────

BB_LISTING  = "https://www.bigbasket.com/listing-svc/v2/products"
BB_DELIVERY = 30


async def fetch_bigbasket(client: httpx.AsyncClient, query: str) -> Optional[dict]:
    try:
        resp = await client.get(
            BB_LISTING,
            params={"slug": query, "page": 1, "tab": "prd", "listingPageType": "srch"},
            headers={
                "x-channel":      "BB-WEB",
                "Accept":         "application/json",
                "Accept-Language": "en-IN,en;q=0.9",
                "Referer":        f"https://www.bigbasket.com/ps/?q={quote_plus(query)}",
                "Origin":         "https://www.bigbasket.com",
                "User-Agent":     USER_AGENTS[1],
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()

        products = (
            (data.get("tab_info") or [{}])[0].get("prod_list")
            or data.get("data", {}).get("product", {}).get("products")
            or data.get("products")
            or []
        )
        if not products:
            return None

        item    = products[0]
        pricing = item.get("pricing", {}).get("discount") or item.get("sp", {}) or {}
        mrp     = float(pricing.get("mrp") or item.get("mrp") or 0)
        price   = float(pricing.get("pricenow") or pricing.get("price") or item.get("sp") or mrp)
        if price <= 0:
            price = mrp
        if price <= 0:
            return None

        oos_raw  = (item.get("w", {}) or {}).get("oos")
        in_stock = str(oos_raw) in ("0", "None", "") if oos_raw is not None else True
        bb_id    = str(item.get("id") or item.get("product_id") or "")
        url_path = item.get("absolute_url") or item.get("slug") or ""
        images   = item.get("images") or []
        img_url  = (images[0].get("s") or images[0].get("m")) if images else None

        return {
            "price":        price,
            "mrp":          mrp if mrp > price else price,
            "discount_pct": float(pricing.get("disc_pct") or 0),
            "is_available": in_stock,
            "pid":          bb_id,
            "url":          f"https://www.bigbasket.com{url_path}" if url_path else None,
            "image_url":    img_url,
            "delivery_mins": BB_DELIVERY,
        }
    except Exception:
        return None


# ── Instamart (Swiggy) scraping ──────────────────────────────────────────────

IM_SEARCH   = "https://www.swiggy.com/mapi/instamart/search"
IM_DELIVERY = 15


async def fetch_instamart(client: httpx.AsyncClient, query: str) -> Optional[dict]:
    try:
        resp = await client.get(
            IM_SEARCH,
            params={
                "pageNumber":           0,
                "searchResultsOffset":  0,
                "query":                query,
                "layoutType":           "GROCERY_SEARCH",
                "isPreSearchTag":       "false",
                "highConfidencePageNo": 0,
                "lowConfidencePageNo":  0,
            },
            headers={
                "Accept":       "*/*",
                "Content-Type": "application/json",
                "_tid":         "d7c5bc3f-49f8-4a4b-8f3c-b1c4b9f13a2b",
                "rid":          "c9d5ac8f-71a4-4c5b-8e61-1f2f3a4b5c6d",
                "deviceId":     "web-pba001",
                "Referer":      f"https://www.swiggy.com/instamart/search?query={quote_plus(query)}",
                "Origin":       "https://www.swiggy.com",
                "User-Agent":   USER_AGENTS[2],
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()

        # Walk Swiggy's widget structure
        skus: list = []
        try:
            for widget in (data.get("data", {}) or {}).get("widgets", []):
                for store in (widget.get("data", {}) or {}).get("stores", []):
                    s = store.get("skus", [])
                    if s:
                        skus = s
                        break
                if skus:
                    break
        except Exception:
            pass
        if not skus:
            skus = data.get("data", {}).get("products") or data.get("products") or []
        if not skus:
            return None

        item  = skus[0]
        mrp   = float(item.get("strike_price") or item.get("mrp") or 0)
        price = float(item.get("price") or item.get("final_price") or mrp)
        if price <= 0:
            price = mrp
        if price <= 0:
            return None

        avail    = item.get("availability") or {}
        in_stock = avail.get("available_quantity", 1) > 0 if isinstance(avail, dict) else bool(avail)
        item_id  = str(item.get("id") or item.get("product_id") or "")
        img_url  = item.get("img_url") or item.get("image_url")

        return {
            "price":        price,
            "mrp":          mrp if mrp > price else price,
            "discount_pct": round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
            "is_available": in_stock,
            "pid":          item_id,
            "url":          f"https://www.swiggy.com/instamart/product/{item_id}" if item_id else None,
            "image_url":    img_url,
            "delivery_mins": IM_DELIVERY,
        }
    except Exception:
        return None


# ── JioMart scraping ─────────────────────────────────────────────────────────

JM_SEARCH   = "https://www.jiomart.com/catalog/product/get_json_data"
JM_DELIVERY = 30


async def fetch_jiomart(client: httpx.AsyncClient, query: str) -> Optional[dict]:
    try:
        resp = await client.get(
            JM_SEARCH,
            params={"q": query, "cat_id": "", "page_no": 1, "page_size": 5,
                    "sort_by": "relevance", "channel": "web"},
            headers={
                "Accept":         "application/json, text/plain, */*",
                "Referer":        f"https://www.jiomart.com/search#query={quote_plus(query)}",
                "x-channel":      "web",
                "Origin":         "https://www.jiomart.com",
                "User-Agent":     USER_AGENTS[0],
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()

        products = (
            data.get("data", {}).get("products")
            or data.get("products")
            or data.get("items")
            or []
        )
        if not products:
            return None

        item = products[0]
        pd   = item.get("price") or {}
        if isinstance(pd, dict):
            price = float(pd.get("final_price") or pd.get("special_price") or 0)
            mrp   = float(pd.get("old_price") or pd.get("regular_price") or price)
        else:
            price = float(pd or item.get("final_price") or 0)
            mrp   = float(item.get("mrp") or item.get("old_price") or price)

        if price <= 0:
            return None

        in_stock = str(item.get("stock_status") or "instock").lower() in ("instock", "in_stock", "1", "true")
        pid      = str(item.get("id") or item.get("product_id") or "")
        url_key  = item.get("url_key") or item.get("slug") or ""

        return {
            "price":        price,
            "mrp":          mrp if mrp > price else price,
            "discount_pct": round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
            "is_available": in_stock,
            "pid":          pid,
            "url":          f"https://www.jiomart.com/{url_key}" if url_key else None,
            "image_url":    item.get("image_url") or item.get("thumbnail"),
            "delivery_mins": JM_DELIVERY,
        }
    except Exception:
        return None


# ── Amazon scraping (HTML) ───────────────────────────────────────────────────

AMAZON_SEARCH = "https://www.amazon.in/s"
AMAZON_DELIVERY = 120

_AMZ_PRICE  = [
    re.compile(r'"priceAmount"\s*:\s*"([\d.]+)"'),
    re.compile(r'"buyingPrice"\s*:\s*"([\d.]+)"'),
    re.compile(r'"displayPrice"\s*:\s*"₹\s*([\d,]+)"'),
    re.compile(r'class="a-price-whole"[^>]*>\s*([\d,]+)'),
]
_AMZ_MRP    = [
    re.compile(r'"priceStrikethroughAmount"\s*:\s*"([\d.]+)"'),
    re.compile(r'"listPrice"\s*:\s*"₹\s*([\d,]+)"'),
]
_AMZ_ASIN   = re.compile(r'"asin"\s*:\s*"([A-Z0-9]{10})"')


def _extract_price(patterns, html):
    for pat in patterns:
        m = pat.search(html)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except Exception:
                continue
    return None


async def fetch_amazon(client: httpx.AsyncClient, query: str) -> Optional[dict]:
    try:
        resp = await client.get(
            AMAZON_SEARCH,
            params={"k": query, "i": "nowstore", "ref": "nb_sb_noss"},
            headers={
                "Accept":                  "text/html,application/xhtml+xml,*/*;q=0.8",
                "Accept-Language":         "en-IN,en;q=0.9",
                "Accept-Encoding":         "gzip, deflate, br",
                "Cache-Control":           "no-cache",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent":              USER_AGENTS[0],
            },
            timeout=20.0,
        )
        resp.raise_for_status()
        html  = resp.text
        price = _extract_price(_AMZ_PRICE, html)
        if not price or price <= 0:
            return None

        mrp  = _extract_price(_AMZ_MRP, html) or price
        asin = _AMZ_ASIN.search(html)
        asin_str = asin.group(1) if asin else ""

        return {
            "price":        price,
            "mrp":          mrp if mrp > price else price,
            "discount_pct": round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0,
            "is_available": True,
            "pid":          asin_str,
            "url":          f"https://www.amazon.in/dp/{asin_str}" if asin_str else "https://www.amazon.in",
            "image_url":    None,
            "delivery_mins": AMAZON_DELIVERY,
        }
    except Exception:
        return None


# ── DB helpers ───────────────────────────────────────────────────────────────

async def upsert_platform(db: AsyncSession, data: dict) -> Platform:
    result = await db.execute(select(Platform).where(Platform.slug == data["slug"]))
    p = result.scalar_one_or_none()
    if p is None:
        p = Platform(**{k: v for k, v in data.items() if k != "scraping_enabled"})
        p.scraping_enabled = data.get("scraping_enabled", True)
        db.add(p)
    else:
        for k, v in data.items():
            setattr(p, k, v)
    await db.flush()
    return p


async def upsert_category(db: AsyncSession, data: dict) -> Category:
    result = await db.execute(select(Category).where(Category.slug == data["slug"]))
    c = result.scalar_one_or_none()
    if c is None:
        c = Category(**data)
        db.add(c)
    else:
        for k, v in data.items():
            setattr(c, k, v)
    await db.flush()
    return c


async def upsert_product(db: AsyncSession, item: dict, cat_id: Optional[uuid.UUID]) -> Product:
    result = await db.execute(select(Product).where(Product.slug == item["slug"]))
    p = result.scalar_one_or_none()
    if p is None:
        p = Product(
            slug=item["slug"],
            name=item["name"],
            brand=item.get("brand"),
            unit=item.get("unit"),
            description=f"{item['name']} — {item.get('unit') or ''}".strip(" —"),
            category_id=cat_id,
            image_url=item.get("image_url"),
            thumbnail_url=item.get("image_url"),
            tags=item.get("tags"),
            is_featured=True,
            is_active=True,
        )
        db.add(p)
    else:
        if item.get("image_url") and not p.image_url:
            p.image_url    = item["image_url"]
            p.thumbnail_url = item["image_url"]
        if item.get("name"):
            p.name = item["name"]
        if item.get("brand"):
            p.brand = item["brand"]
        if cat_id and not p.category_id:
            p.category_id = cat_id
        p.is_active   = True
        p.is_featured = True
    await db.flush()
    return p


async def upsert_price(
    db: AsyncSession,
    product_id: uuid.UUID,
    platform_id: uuid.UUID,
    price_data: dict,
    platform_slug: str,
) -> None:
    result = await db.execute(
        select(PlatformPrice).where(
            PlatformPrice.product_id == product_id,
            PlatformPrice.platform_id == platform_id,
        )
    )
    pp = result.scalar_one_or_none()
    disc_label = f"{int(price_data['discount_pct'])}% OFF" if price_data["discount_pct"] > 0 else None

    if pp is None:
        pp = PlatformPrice(
            product_id=product_id,
            platform_id=platform_id,
            price=price_data["price"],
            original_price=price_data["mrp"] if price_data["mrp"] > price_data["price"] else None,
            discount_percent=price_data["discount_pct"],
            discount_label=disc_label,
            is_available=price_data["is_available"],
            delivery_time_minutes=price_data["delivery_mins"],
            platform_product_id=price_data.get("pid") or None,
            platform_product_url=price_data.get("url"),
            platform_image_url=price_data.get("image_url"),
            source="scrape",
        )
        db.add(pp)
    else:
        pp.price              = price_data["price"]
        pp.original_price     = price_data["mrp"] if price_data["mrp"] > price_data["price"] else None
        pp.discount_percent   = price_data["discount_pct"]
        pp.discount_label     = disc_label
        pp.is_available       = price_data["is_available"]
        pp.delivery_time_minutes = price_data["delivery_mins"]
        if price_data.get("pid"):
            pp.platform_product_id = price_data["pid"]
        if price_data.get("url"):
            pp.platform_product_url = price_data["url"]
        if price_data.get("image_url") and not pp.platform_image_url:
            pp.platform_image_url = price_data["image_url"]
        pp.source = "scrape"
    await db.flush()


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    print("\n" + "═" * 60)
    print("  PriceBasket — Master Seed + Scrape")
    print("═" * 60)
    start = time.time()

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # ── 1. Seed Platforms ──────────────────────────────────────────────
        print("\n📡  Seeding platforms…")
        for pdata in PLATFORMS:
            await upsert_platform(db, pdata)
        await db.commit()

        # Build slug → Platform map
        result = await db.execute(select(Platform))
        plat_map: dict[str, Platform] = {p.slug: p for p in result.scalars().all()}
        print(f"   ✅  {len(plat_map)} platforms ready: {', '.join(plat_map.keys())}")

        # ── 2. Seed Categories ─────────────────────────────────────────────
        print("\n🗂   Seeding categories…")
        for cdata in CATEGORIES:
            await upsert_category(db, cdata)
        await db.commit()

        result   = await db.execute(select(Category))
        cat_map: dict[str, uuid.UUID] = {c.slug: c.id for c in result.scalars().all()}
        print(f"   ✅  {len(cat_map)} categories ready")

        # ── 3. Scrape Blinkit + cross-platform prices ──────────────────────
        print(f"\n🛒  Scraping Blinkit (primary) + other platforms…")
        print(f"    Location: lat={LAT}, lon={LON}  (Delhi NCR)\n")

        total_products = 0
        total_prices   = 0
        seen_slugs: set[str] = set()

        # Semaphore to avoid hammering any single platform
        sem = asyncio.Semaphore(3)

        async def scrape_platform(client, fn, query, slug):
            async with sem:
                await asyncio.sleep(0.3)
                return slug, await fn(client, query)

        async with httpx.AsyncClient(follow_redirects=True) as client:
            for cat_slug, queries in BLINKIT_QUERIES:
                cat_saved = 0
                print(f"\n📦  [{cat_slug}]")

                for q_idx, query in enumerate(queries):
                    await asyncio.sleep(0.5)  # polite delay between Blinkit calls
                    raw_list = await fetch_blinkit(client, query, attempt=q_idx)

                    for raw in raw_list:
                        item = parse_blinkit_product(raw, cat_slug)
                        if not item or item["slug"] in seen_slugs:
                            continue
                        seen_slugs.add(item["slug"])

                        try:
                            product = await upsert_product(db, item, cat_map.get(cat_slug))
                            await db.flush()

                            # Save Blinkit price
                            blinkit_data = {
                                "price":        item["price"],
                                "mrp":          item["mrp"],
                                "discount_pct": item["discount_percent"],
                                "is_available": item["is_available"],
                                "pid":          item["blinkit_pid"],
                                "url":          item["product_url"],
                                "image_url":    item["image_url"],
                                "delivery_mins": BLINKIT_DELIVERY,
                            }
                            if "blinkit" in plat_map:
                                await upsert_price(db, product.id, plat_map["blinkit"].id,
                                                   blinkit_data, "blinkit")
                                total_prices += 1

                            # Concurrently scrape other platforms
                            tasks = [
                                scrape_platform(client, fetch_zepto,     item["name"], "zepto"),
                                scrape_platform(client, fetch_bigbasket,  item["name"], "bigbasket"),
                                scrape_platform(client, fetch_instamart,  item["name"], "instamart"),
                                scrape_platform(client, fetch_jiomart,    item["name"], "jiomart"),
                                scrape_platform(client, fetch_amazon,     item["name"], "amazon"),
                            ]
                            results = await asyncio.gather(*tasks, return_exceptions=True)

                            for res in results:
                                if isinstance(res, Exception) or res is None:
                                    continue
                                plat_slug, price_data = res
                                if price_data and plat_slug in plat_map:
                                    await upsert_price(db, product.id, plat_map[plat_slug].id,
                                                       price_data, plat_slug)
                                    total_prices += 1

                            cat_saved    += 1
                            total_products += 1

                        except Exception as e:
                            print(f"    ⚠  DB error '{item['name']}': {e}")
                            await db.rollback()

                    print(f"   '{query}' → {len(raw_list)} items", end="\r")

                await db.commit()
                print(f"   ✅  {cat_slug}: {cat_saved} products saved           ")

    elapsed = round(time.time() - start, 1)
    print(f"\n{'═' * 60}")
    print(f"  ✅  Done in {elapsed}s")
    print(f"  📦  Products  : {total_products}")
    print(f"  💰  Price rows: {total_prices}")
    print(f"  🏷   Platforms : {len(plat_map)}")
    print(f"  🗂   Categories: {len(cat_map)}")
    print("═" * 60 + "\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
