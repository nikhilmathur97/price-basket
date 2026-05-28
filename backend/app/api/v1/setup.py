"""
One-time setup endpoints — protected by SEED_SECRET env var.
Used to bootstrap the database on a fresh deployment without needing
an existing admin account.

Endpoints:
  POST /api/v1/setup/seed          — seed platforms + categories + scrape all products/prices
  GET  /api/v1/setup/seed-status   — check progress of running seed job
  POST /api/v1/setup/create-admin  — create/promote an admin user
"""
import asyncio
import re
import uuid
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote_plus

import httpx
import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis_client import cache_delete_pattern
from app.config import settings
from app.database import get_db
from app.models.platform import Platform
from app.models.product import Category, Product
from app.models.price import PlatformPrice

log = structlog.get_logger(__name__)
router = APIRouter()

# ── Auth guard ────────────────────────────────────────────────────────────────

def _require_seed_key(x_seed_key: str = Header(..., alias="x-seed-key")):
    if not settings.SEED_SECRET or x_seed_key != settings.SEED_SECRET:
        raise HTTPException(status_code=403, detail="Invalid seed key")


# ── Seed job state ────────────────────────────────────────────────────────────

_seed_state: dict = {
    "running":    False,
    "started_at": None,
    "progress":   "",
    "products":   0,
    "prices":     0,
    "done":       False,
    "error":      None,
}


# ── Scrapers (inline — no subprocess needed) ──────────────────────────────────

LAT = str(getattr(settings, "BLINKIT_LAT", "28.6139"))
LON = str(getattr(settings, "BLINKIT_LON", "77.2090"))

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

BLINKIT_SEARCH = "https://blinkit.com/v6/listing/products"
BLINKIT_BASE   = "https://blinkit.com"


def _blinkit_headers(query: str, idx: int = 0) -> dict:
    return {
        "app_client": "consumer_web", "lat": LAT, "lon": LON,
        "rn_bundle_version": "1000033", "web-version": "2024120401",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Origin": BLINKIT_BASE,
        "Referer": f"{BLINKIT_BASE}/search?q={quote_plus(query)}",
        "User-Agent": USER_AGENTS[idx % len(USER_AGENTS)],
    }


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:200]


def _img_url(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    name = raw.lstrip("/")
    if name.startswith("rsku_image/products_main/"):
        return f"https://cdn.blinkit.com/{name}"
    return f"https://cdn.blinkit.com/rsku_image/products_main/{name}"


async def _blinkit_search(client: httpx.AsyncClient, query: str, attempt: int = 0) -> list[dict]:
    for retry in range(3):
        try:
            resp = await client.get(
                BLINKIT_SEARCH,
                params={"q": query, "start": 0, "limit": 20, "search_type": 8},
                headers=_blinkit_headers(query, attempt + retry),
                timeout=20.0,
            )
            resp.raise_for_status()
            data = resp.json()
            products: list[dict] = []
            for obj in data.get("objects") or []:
                if isinstance(obj, dict) and obj.get("type") == "PRODUCT" and "data" in obj:
                    products.append(obj["data"])
            if not products and isinstance(data, list):
                products = data
            if not products:
                products = data.get("products") or data.get("results") or []
            return products
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(2 ** retry * 2)
            else:
                return []
        except Exception:
            if retry < 2:
                await asyncio.sleep(1 + retry)
    return []


def _parse_blinkit(raw: dict, cat_slug: str) -> Optional[dict]:
    price = float(raw.get("price") or 0)
    mrp   = float(raw.get("mrp")   or price)
    if price <= 0 and mrp <= 0:
        return None
    if price <= 0:
        price = mrp
    in_stock  = bool(raw.get("in_stock") or raw.get("available") or raw.get("is_in_stock"))
    raw_imgs  = raw.get("images") or []
    raw_img   = None
    if raw_imgs:
        first   = raw_imgs[0]
        raw_img = first.get("name") or first.get("url") or (first if isinstance(first, str) else None)
    else:
        raw_img = raw.get("image_url") or raw.get("thumbnail")
    image_url = _img_url(raw_img)
    name  = (raw.get("name") or "").strip()
    brand = (raw.get("brand") or raw.get("brand_name") or "").strip()
    unit  = (raw.get("unit") or raw.get("quantity") or raw.get("variant_name") or "").strip()
    pid   = str(raw.get("id") or raw.get("product_id") or raw.get("variant_id") or "")
    slug  = _slugify(raw.get("slug") or pid or name)
    if not name or not slug:
        return None
    disc = round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0
    url  = f"{BLINKIT_BASE}/prn/{raw.get('slug') or pid}" if (raw.get("slug") or pid) else None
    return {
        "pid": pid, "name": name, "brand": brand or None, "unit": unit or None,
        "slug": slug, "cat": cat_slug, "image_url": image_url,
        "price": price, "mrp": mrp, "disc": disc, "available": in_stock, "url": url,
        "tags": [t.lower() for t in [name, brand, cat_slug, unit] if t],
    }


async def _zepto(client: httpx.AsyncClient, q: str) -> Optional[dict]:
    for sid in ["1", "72", "101"]:
        try:
            r = await client.post(
                "https://api.zeptonow.com/api/v3/search",
                json={"query": q, "pageNumber": 0, "pageSize": 5, "mode": "PRODUCT_SEARCH"},
                headers={"x-app-version": "11.20.3", "x-platform": "WEB", "store_id": sid,
                         "Content-Type": "application/json", "Origin": "https://www.zeptonow.com",
                         "User-Agent": USER_AGENTS[0]},
                timeout=12.0,
            )
            r.raise_for_status()
            data = r.json()
            items = data.get("items") or data.get("data", {}).get("items") or []
            for raw in items:
                c = raw.get("productResponse") or raw.get("product") or raw
                mp = float(c.get("mrp") or 0) / 100
                sp = float(c.get("price") or c.get("discountedPrice") or mp * 100) / 100
                if sp <= 0:
                    continue
                pid = str(c.get("productId") or c.get("id") or "")
                return {"price": sp, "mrp": max(mp, sp), "disc": round((mp-sp)/mp*100,1) if mp>sp else 0,
                        "available": bool(c.get("inventoryAvailable", True)), "pid": pid,
                        "url": f"https://www.zeptonow.com/product/{pid}" if pid else None,
                        "image_url": c.get("imgUrl"), "mins": 10}
        except Exception:
            continue
    return None


async def _bigbasket(client: httpx.AsyncClient, q: str) -> Optional[dict]:
    try:
        r = await client.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params={"slug": q, "page": 1, "tab": "prd", "listingPageType": "srch"},
            headers={"x-channel": "BB-WEB", "Accept": "application/json",
                     "Referer": f"https://www.bigbasket.com/ps/?q={quote_plus(q)}",
                     "User-Agent": USER_AGENTS[1]},
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        products = (data.get("tab_info") or [{}])[0].get("prod_list") or \
                   data.get("data", {}).get("product", {}).get("products") or \
                   data.get("products") or []
        if not products:
            return None
        item = products[0]
        pr   = item.get("pricing", {}).get("discount") or item.get("sp", {}) or {}
        mrp  = float(pr.get("mrp") or item.get("mrp") or 0)
        sp   = float(pr.get("pricenow") or pr.get("price") or item.get("sp") or mrp)
        if sp <= 0:
            sp = mrp
        if sp <= 0:
            return None
        oos   = str((item.get("w") or {}).get("oos", "0"))
        imgs  = item.get("images") or []
        img   = (imgs[0].get("s") or imgs[0].get("m")) if imgs else None
        url_p = item.get("absolute_url") or item.get("slug") or ""
        return {"price": sp, "mrp": max(mrp, sp), "disc": float(pr.get("disc_pct") or 0),
                "available": oos in ("0", ""), "pid": str(item.get("id") or ""),
                "url": f"https://www.bigbasket.com{url_p}" if url_p else None,
                "image_url": img, "mins": 30}
    except Exception:
        return None


async def _instamart(client: httpx.AsyncClient, q: str) -> Optional[dict]:
    try:
        r = await client.get(
            "https://www.swiggy.com/mapi/instamart/search",
            params={"pageNumber": 0, "searchResultsOffset": 0, "query": q,
                    "layoutType": "GROCERY_SEARCH", "isPreSearchTag": "false"},
            headers={"Accept": "*/*", "_tid": "d7c5bc3f-49f8-4a4b-8f3c-b1c4b9f13a2b",
                     "rid": "c9d5ac8f-71a4-4c5b-8e61-1f2f3a4b5c6d",
                     "Origin": "https://www.swiggy.com", "User-Agent": USER_AGENTS[0]},
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        skus: list = []
        try:
            for w in (data.get("data") or {}).get("widgets", []):
                for s in (w.get("data") or {}).get("stores", []):
                    sk = s.get("skus", [])
                    if sk:
                        skus = sk; break
                if skus: break
        except Exception:
            pass
        if not skus:
            skus = (data.get("data") or {}).get("products") or []
        if not skus:
            return None
        item = skus[0]
        mrp  = float(item.get("strike_price") or item.get("mrp") or 0)
        sp   = float(item.get("price") or item.get("final_price") or mrp)
        if sp <= 0: sp = mrp
        if sp <= 0: return None
        iid  = str(item.get("id") or "")
        return {"price": sp, "mrp": max(mrp, sp), "disc": round((mrp-sp)/mrp*100,1) if mrp>sp else 0,
                "available": True, "pid": iid,
                "url": f"https://www.swiggy.com/instamart/product/{iid}" if iid else None,
                "image_url": item.get("img_url"), "mins": 15}
    except Exception:
        return None


async def _jiomart(client: httpx.AsyncClient, q: str) -> Optional[dict]:
    try:
        r = await client.get(
            "https://www.jiomart.com/catalog/product/get_json_data",
            params={"q": q, "cat_id": "", "page_no": 1, "page_size": 5},
            headers={"Accept": "application/json", "x-channel": "web",
                     "Origin": "https://www.jiomart.com", "User-Agent": USER_AGENTS[0]},
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        products = data.get("data", {}).get("products") or data.get("products") or []
        if not products: return None
        item = products[0]
        pd   = item.get("price") or {}
        sp   = float(pd.get("final_price") or pd.get("special_price") or 0) if isinstance(pd, dict) else float(pd or 0)
        mrp  = float(pd.get("old_price") or pd.get("regular_price") or sp) if isinstance(pd, dict) else float(item.get("mrp") or sp)
        if sp <= 0: return None
        pid  = str(item.get("id") or "")
        uk   = item.get("url_key") or ""
        return {"price": sp, "mrp": max(mrp, sp), "disc": round((mrp-sp)/mrp*100,1) if mrp>sp else 0,
                "available": True, "pid": pid,
                "url": f"https://www.jiomart.com/{uk}" if uk else None,
                "image_url": item.get("image_url"), "mins": 30}
    except Exception:
        return None


# ── Platform + Category seed data ─────────────────────────────────────────────

PLATFORMS_DATA = [
    dict(slug="blinkit",   name="Blinkit",         color_hex="#F8C920",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/2/2f/Blinkit-yellow-app-icon.svg",
         avg_delivery_minutes=10, min_order_amount=0,   delivery_fee=25,  free_delivery_threshold=199, scraping_enabled=True),
    dict(slug="zepto",     name="Zepto",            color_hex="#8B5CF6",
         logo_url="https://play-lh.googleusercontent.com/WGRtFg-eaXkSFlHmHiGXP95X4Ixq2_n5OkLFTjBmXvjU2tP7KnMAtE1oeP7tB9c-Xg=w240-h480",
         avg_delivery_minutes=10, min_order_amount=0,   delivery_fee=20,  free_delivery_threshold=149, scraping_enabled=True),
    dict(slug="bigbasket", name="BB Now",           color_hex="#84CC16",
         logo_url="https://play-lh.googleusercontent.com/fPaJ7nEVE0jHMG0qdibOt32RBf51dC5-W6sAj4slVxUqCPAiuC7IhH4yPc5W0Bm0XA=w240-h480",
         avg_delivery_minutes=30, min_order_amount=200, delivery_fee=40,  free_delivery_threshold=500, scraping_enabled=True),
    dict(slug="instamart", name="Swiggy Instamart", color_hex="#FF6600",
         logo_url="https://play-lh.googleusercontent.com/n0PBTbEAp4FoLnVJzJnlVAL0U1O3R5N4R7IrjTnZIwikGjqX8VzKrDv7cExhSJtd5Q=w240-h480",
         avg_delivery_minutes=15, min_order_amount=0,   delivery_fee=30,  free_delivery_threshold=299, scraping_enabled=True),
    dict(slug="amazon",    name="Amazon Fresh",     color_hex="#FF9900",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
         avg_delivery_minutes=120, min_order_amount=0,  delivery_fee=0,   free_delivery_threshold=499, scraping_enabled=True),
    dict(slug="flipkart",  name="Flipkart Minutes", color_hex="#2874F0",
         logo_url="https://upload.wikimedia.org/wikipedia/en/1/1b/NowFloats-Boost_Flipkart_logo.png",
         avg_delivery_minutes=10, min_order_amount=0,   delivery_fee=25,  free_delivery_threshold=199, scraping_enabled=True),
    dict(slug="jiomart",   name="JioMart",          color_hex="#0066CC",
         logo_url="https://upload.wikimedia.org/wikipedia/en/3/38/JioMart_Logo.png",
         avg_delivery_minutes=30, min_order_amount=0,   delivery_fee=0,   free_delivery_threshold=0,   scraping_enabled=True),
    dict(slug="myntra",    name="Myntra",           color_hex="#FF3F6C",
         logo_url="https://aartisto.com/wp-content/uploads/2020/01/myntra.png",
         avg_delivery_minutes=1440, min_order_amount=0, delivery_fee=0,   free_delivery_threshold=999, scraping_enabled=False),
    dict(slug="nykaa",     name="Nykaa",            color_hex="#FC2779",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/a/a1/Nykaa_Logo.png",
         avg_delivery_minutes=1440, min_order_amount=0, delivery_fee=0,   free_delivery_threshold=499, scraping_enabled=False),
]

FOOD_IMG = {
    "spinach":   "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop",
    "milk":      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
    "chips":     "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop",
    "bread":     "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    "detergent": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop",
    "shampoo":   "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&h=400&fit=crop",
    "chicken":   "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop",
    "flour":     "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop",
    "oil":       "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop",
    "baby":      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    "pet":       "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    "ice":       "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=400&h=400&fit=crop",
}

CATEGORIES_DATA = [
    dict(slug="fruits-vegetables", name="Fruits & Vegetables", icon="🥦", display_order=1,  image_url=FOOD_IMG["spinach"], is_active=True),
    dict(slug="dairy-breakfast",   name="Dairy & Breakfast",   icon="🥛", display_order=2,  image_url=FOOD_IMG["milk"],    is_active=True),
    dict(slug="snacks-drinks",     name="Snacks & Drinks",     icon="🍿", display_order=3,  image_url=FOOD_IMG["chips"],   is_active=True),
    dict(slug="bakery",            name="Bakery & Biscuits",   icon="🍞", display_order=4,  image_url=FOOD_IMG["bread"],   is_active=True),
    dict(slug="household",         name="Household",           icon="🧹", display_order=5,  image_url=FOOD_IMG["detergent"], is_active=True),
    dict(slug="personal-care",     name="Personal Care",       icon="🧴", display_order=6,  image_url=FOOD_IMG["shampoo"], is_active=True),
    dict(slug="chicken-meat",      name="Chicken & Meat",      icon="🍗", display_order=7,  image_url=FOOD_IMG["chicken"], is_active=True),
    dict(slug="frozen-foods",      name="Frozen Foods",        icon="🧊", display_order=8,  image_url=FOOD_IMG["ice"],     is_active=True),
    dict(slug="baby-care",         name="Baby Care",           icon="👶", display_order=9,  image_url=FOOD_IMG["baby"],    is_active=True),
    dict(slug="pet-care",          name="Pet Care",            icon="🐾", display_order=10, image_url=FOOD_IMG["pet"],     is_active=True),
    dict(slug="staples",           name="Atta, Rice & Dal",    icon="🌾", display_order=11, image_url=FOOD_IMG["flour"],   is_active=True),
    dict(slug="oils-spices",       name="Oils & Spices",       icon="🫙", display_order=12, image_url=FOOD_IMG["oil"],     is_active=True),
]

BLINKIT_QUERIES = [
    ("fruits-vegetables", ["fresh onion", "tomato", "banana", "spinach palak", "apple shimla", "potato aloo", "lemon nimbu", "capsicum", "carrot", "cucumber", "garlic lehsun", "ginger adrak", "green chilli", "pineapple", "watermelon", "grapes", "pomegranate"]),
    ("dairy-breakfast",   ["amul gold milk 1l", "amul butter 500g", "mother dairy curd 400g", "country delight eggs 12", "amul paneer 200g", "amul cheese slice", "mother dairy milk", "kellogg cornflakes", "muesli oats"]),
    ("snacks-drinks",     ["lays magic masala chips", "kurkure masala", "haldirams aloo bhujia", "coca cola", "pepsi 2l", "red bull energy drink", "tropicana juice", "parle g biscuit", "britannia good day", "oreo biscuit", "doritos nachos", "mango slice drink", "frooti", "thums up"]),
    ("bakery",            ["harvest gold white bread", "britannia 5050 biscuit", "oreo cream biscuit", "mcvities digestive", "sunfeast marie biscuit", "britannia bourbon"]),
    ("staples",           ["aashirvaad wheat atta 5kg", "india gate basmati rice", "tata sampann toor dal", "chana dal 1kg", "urad dal", "moong dal", "poha", "suji rava", "besan gram flour", "rajma"]),
    ("oils-spices",       ["fortune sunflower oil", "saffola gold oil", "dabur honey", "mdh kitchen king masala", "everest red chilli powder", "turmeric haldi", "cumin jeera", "garam masala", "tata salt", "amul ghee 500g"]),
    ("household",         ["vim dishwash bar", "surf excel detergent", "harpic toilet cleaner", "lizol floor cleaner", "dettol antiseptic liquid", "ariel detergent powder", "pril dishwash liquid", "odonil air freshener", "hit cockroach spray"]),
    ("personal-care",     ["dove soap bar", "head shoulders shampoo", "colgate toothpaste 150g", "nivea body lotion", "dettol soap", "ponds face cream", "vaseline jelly", "himalaya face wash", "pantene shampoo"]),
    ("chicken-meat",      ["licious chicken breast boneless", "licious chicken curry cut", "country delight eggs", "licious mutton keema"]),
    ("frozen-foods",      ["mccain french fries", "sumeru frozen peas", "amul ice cream", "kwality walls cornetto", "igloo ice cream"]),
    ("baby-care",         ["pampers diapers", "huggies diapers", "johnsons baby shampoo", "nestle cerelac"]),
    ("pet-care",          ["pedigree adult dog food", "whiskas cat food", "drools dog food"]),
]


# ── Background seed job ───────────────────────────────────────────────────────

async def _run_seed():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.models.platform import Platform
    from app.models.product import Category, Product
    from app.models.price import PlatformPrice

    _seed_state.update(running=True, done=False, error=None, products=0, prices=0,
                       started_at=datetime.now(timezone.utc).isoformat(), progress="starting")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSess = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with AsyncSess() as db:

            # ── 1. Platforms ────────────────────────────────────────────────
            _seed_state["progress"] = "seeding platforms"
            for pdata in PLATFORMS_DATA:
                r = await db.execute(select(Platform).where(Platform.slug == pdata["slug"]))
                p = r.scalar_one_or_none()
                if p is None:
                    p = Platform(**pdata)
                    db.add(p)
                else:
                    for k, v in pdata.items():
                        setattr(p, k, v)
                await db.flush()
            await db.commit()

            r = await db.execute(select(Platform))
            plat_map: dict[str, Platform] = {p.slug: p for p in r.scalars().all()}

            # ── 2. Categories ───────────────────────────────────────────────
            _seed_state["progress"] = "seeding categories"
            for cdata in CATEGORIES_DATA:
                r = await db.execute(select(Category).where(Category.slug == cdata["slug"]))
                c = r.scalar_one_or_none()
                if c is None:
                    db.add(Category(**cdata))
                else:
                    for k, v in cdata.items():
                        setattr(c, k, v)
                await db.flush()
            await db.commit()

            r = await db.execute(select(Category))
            cat_map: dict[str, uuid.UUID] = {c.slug: c.id for c in r.scalars().all()}

            # ── 3. Scrape + save ─────────────────────────────────────────────
            sem  = asyncio.Semaphore(3)
            seen: set[str] = set()

            async def _scrape_other(client, fn, name, slug):
                async with sem:
                    await asyncio.sleep(0.3)
                    try:
                        return slug, await fn(client, name)
                    except Exception:
                        return slug, None

            async with httpx.AsyncClient(follow_redirects=True) as client:
                for cat_slug, queries in BLINKIT_QUERIES:
                    _seed_state["progress"] = f"scraping {cat_slug}"
                    for q_idx, query in enumerate(queries):
                        await asyncio.sleep(0.5)
                        raw_list = await _blinkit_search(client, query, attempt=q_idx)
                        for raw in raw_list:
                            item = _parse_blinkit(raw, cat_slug)
                            if not item or item["slug"] in seen:
                                continue
                            seen.add(item["slug"])
                            try:
                                # Upsert product
                                rp = await db.execute(select(Product).where(Product.slug == item["slug"]))
                                prod = rp.scalar_one_or_none()
                                cat_id = cat_map.get(cat_slug)
                                if prod is None:
                                    prod = Product(
                                        slug=item["slug"], name=item["name"], brand=item["brand"],
                                        unit=item["unit"], category_id=cat_id,
                                        image_url=item["image_url"], thumbnail_url=item["image_url"],
                                        tags=item["tags"], is_featured=True, is_active=True,
                                        description=f"{item['name']} — {item['unit'] or ''}".strip(" —"),
                                    )
                                    db.add(prod)
                                else:
                                    if item["image_url"] and not prod.image_url:
                                        prod.image_url = item["image_url"]
                                        prod.thumbnail_url = item["image_url"]
                                    prod.is_featured = True
                                    prod.is_active   = True
                                await db.flush()

                                # Blinkit price
                                bl = plat_map.get("blinkit")
                                if bl:
                                    await _upsert_price(db, prod.id, bl.id, {
                                        "price": item["price"], "mrp": item["mrp"],
                                        "disc": item["disc"], "available": item["available"],
                                        "pid": item["pid"], "url": item["url"],
                                        "image_url": item["image_url"], "mins": 10,
                                    })
                                    _seed_state["prices"] += 1

                                # Cross-platform prices concurrently
                                tasks = [
                                    _scrape_other(client, _zepto,     item["name"], "zepto"),
                                    _scrape_other(client, _bigbasket, item["name"], "bigbasket"),
                                    _scrape_other(client, _instamart, item["name"], "instamart"),
                                    _scrape_other(client, _jiomart,   item["name"], "jiomart"),
                                ]
                                results = await asyncio.gather(*tasks, return_exceptions=True)
                                for res in results:
                                    if isinstance(res, Exception) or not res:
                                        continue
                                    pslug, pdata = res
                                    if pdata and pslug in plat_map:
                                        await _upsert_price(db, prod.id, plat_map[pslug].id, pdata)
                                        _seed_state["prices"] += 1

                                _seed_state["products"] += 1

                            except Exception as e:
                                log.warning("seed_product_error", error=str(e))
                                await db.rollback()

                    await db.commit()

        await cache_delete_pattern("featured:*")
        _seed_state["progress"] = "done"
        _seed_state["done"]     = True

    except Exception as e:
        log.error("seed_job_failed", error=str(e))
        _seed_state["error"]    = str(e)
        _seed_state["progress"] = "failed"
    finally:
        _seed_state["running"] = False
        await engine.dispose()


async def _upsert_price(db: AsyncSession, product_id, platform_id, d: dict):
    from app.models.price import PlatformPrice
    r  = await db.execute(
        select(PlatformPrice).where(
            PlatformPrice.product_id == product_id,
            PlatformPrice.platform_id == platform_id,
        )
    )
    pp = r.scalar_one_or_none()
    label = f"{int(d['disc'])}% OFF" if d.get("disc", 0) > 0 else None
    if pp is None:
        pp = PlatformPrice(
            product_id=product_id, platform_id=platform_id,
            price=d["price"], original_price=d["mrp"] if d["mrp"] > d["price"] else None,
            discount_percent=d.get("disc", 0), discount_label=label,
            is_available=d.get("available", True),
            delivery_time_minutes=d.get("mins"), platform_product_id=d.get("pid") or None,
            platform_product_url=d.get("url"), platform_image_url=d.get("image_url"),
            source="scrape",
        )
        db.add(pp)
    else:
        pp.price             = d["price"]
        pp.original_price    = d["mrp"] if d["mrp"] > d["price"] else None
        pp.discount_percent  = d.get("disc", 0)
        pp.discount_label    = label
        pp.is_available      = d.get("available", True)
        pp.delivery_time_minutes = d.get("mins")
        if d.get("pid"):      pp.platform_product_id  = d["pid"]
        if d.get("url"):      pp.platform_product_url  = d["url"]
        if d.get("image_url") and not pp.platform_image_url:
            pp.platform_image_url = d["image_url"]
        pp.source = "scrape"
    await db.flush()


# ── Static image URLs for seeded products ────────────────────────────────────

PRODUCT_IMAGES: dict[str, str] = {
    "amul-gold-milk-1l":              "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
    "amul-butter-500g":               "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop",
    "britannia-bread-400g":           "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    "lays-classic-26g":               "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop",
    "haldirams-aloo-bhujia-200g":     "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop",
    "maggi-noodles-70g":              "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop",
    "coca-cola-750ml":                "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop",
    "tropicana-orange-1l":            "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop",
    "dove-soap-100g":                 "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&h=400&fit=crop",
    "head-shoulders-shampoo-180ml":   "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400&h=400&fit=crop",
    "vim-dish-wash-bar-200g":         "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop",
    "harpic-toilet-cleaner-500ml":    "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop",
    "lakme-foundation-30ml":          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
    "maybelline-mascara-9ml":         "https://images.unsplash.com/photo-1631214499789-a23a7ece09c7?w=400&h=400&fit=crop",
}

# ── Static price seed data ────────────────────────────────────────────────────

STATIC_PRICES = {
    "amul-gold-milk-1l": [
        {"slug": "blinkit",   "price": 68,  "mrp": 68,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 68,  "mrp": 68,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 66,  "mrp": 68,  "disc": 2.9,  "mins": 30,  "available": True},
        {"slug": "instamart", "price": 68,  "mrp": 68,  "disc": 0,    "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 65,  "mrp": 68,  "disc": 4.4,  "mins": 120, "available": True},
    ],
    "amul-butter-500g": [
        {"slug": "blinkit",   "price": 275, "mrp": 290, "disc": 5.2,  "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 275, "mrp": 290, "disc": 5.2,  "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 270, "mrp": 290, "disc": 6.9,  "mins": 30,  "available": True},
        {"slug": "instamart", "price": 279, "mrp": 290, "disc": 3.8,  "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 265, "mrp": 290, "disc": 8.6,  "mins": 120, "available": True},
    ],
    "britannia-bread-400g": [
        {"slug": "blinkit",   "price": 40,  "mrp": 44,  "disc": 9.1,  "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 42,  "mrp": 44,  "disc": 4.5,  "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 40,  "mrp": 44,  "disc": 9.1,  "mins": 30,  "available": True},
        {"slug": "instamart", "price": 43,  "mrp": 44,  "disc": 2.3,  "mins": 15,  "available": True},
        {"slug": "jiomart",   "price": 38,  "mrp": 44,  "disc": 13.6, "mins": 30,  "available": True},
    ],
    "lays-classic-26g": [
        {"slug": "blinkit",   "price": 20,  "mrp": 20,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 20,  "mrp": 20,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 18,  "mrp": 20,  "disc": 10,   "mins": 30,  "available": True},
        {"slug": "instamart", "price": 20,  "mrp": 20,  "disc": 0,    "mins": 15,  "available": True},
        {"slug": "jiomart",   "price": 19,  "mrp": 20,  "disc": 5,    "mins": 30,  "available": True},
    ],
    "haldirams-aloo-bhujia-200g": [
        {"slug": "blinkit",   "price": 85,  "mrp": 90,  "disc": 5.6,  "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 87,  "mrp": 90,  "disc": 3.3,  "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 83,  "mrp": 90,  "disc": 7.8,  "mins": 30,  "available": True},
        {"slug": "instamart", "price": 86,  "mrp": 90,  "disc": 4.4,  "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 80,  "mrp": 90,  "disc": 11.1, "mins": 120, "available": True},
    ],
    "maggi-noodles-70g": [
        {"slug": "blinkit",   "price": 14,  "mrp": 14,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 14,  "mrp": 14,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 13,  "mrp": 14,  "disc": 7.1,  "mins": 30,  "available": True},
        {"slug": "instamart", "price": 14,  "mrp": 14,  "disc": 0,    "mins": 15,  "available": True},
        {"slug": "jiomart",   "price": 12,  "mrp": 14,  "disc": 14.3, "mins": 30,  "available": True},
    ],
    "coca-cola-750ml": [
        {"slug": "blinkit",   "price": 40,  "mrp": 42,  "disc": 4.8,  "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 42,  "mrp": 42,  "disc": 0,    "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 38,  "mrp": 42,  "disc": 9.5,  "mins": 30,  "available": True},
        {"slug": "instamart", "price": 40,  "mrp": 42,  "disc": 4.8,  "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 36,  "mrp": 42,  "disc": 14.3, "mins": 120, "available": True},
    ],
    "tropicana-orange-1l": [
        {"slug": "blinkit",   "price": 99,  "mrp": 120, "disc": 17.5, "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 102, "mrp": 120, "disc": 15,   "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 95,  "mrp": 120, "disc": 20.8, "mins": 30,  "available": True},
        {"slug": "instamart", "price": 100, "mrp": 120, "disc": 16.7, "mins": 15,  "available": True},
        {"slug": "jiomart",   "price": 92,  "mrp": 120, "disc": 23.3, "mins": 30,  "available": True},
    ],
    "dove-soap-100g": [
        {"slug": "blinkit",   "price": 55,  "mrp": 60,  "disc": 8.3,  "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 57,  "mrp": 60,  "disc": 5,    "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 53,  "mrp": 60,  "disc": 11.7, "mins": 30,  "available": True},
        {"slug": "instamart", "price": 55,  "mrp": 60,  "disc": 8.3,  "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 50,  "mrp": 60,  "disc": 16.7, "mins": 120, "available": True},
    ],
    "head-shoulders-shampoo-180ml": [
        {"slug": "blinkit",   "price": 199, "mrp": 230, "disc": 13.5, "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 205, "mrp": 230, "disc": 10.9, "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 195, "mrp": 230, "disc": 15.2, "mins": 30,  "available": True},
        {"slug": "instamart", "price": 199, "mrp": 230, "disc": 13.5, "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 190, "mrp": 230, "disc": 17.4, "mins": 120, "available": True},
    ],
    "vim-dish-wash-bar-200g": [
        {"slug": "blinkit",   "price": 22,  "mrp": 25,  "disc": 12,   "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 23,  "mrp": 25,  "disc": 8,    "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 21,  "mrp": 25,  "disc": 16,   "mins": 30,  "available": True},
        {"slug": "instamart", "price": 22,  "mrp": 25,  "disc": 12,   "mins": 15,  "available": True},
        {"slug": "jiomart",   "price": 20,  "mrp": 25,  "disc": 20,   "mins": 30,  "available": True},
    ],
    "harpic-toilet-cleaner-500ml": [
        {"slug": "blinkit",   "price": 89,  "mrp": 99,  "disc": 10.1, "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 90,  "mrp": 99,  "disc": 9.1,  "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 86,  "mrp": 99,  "disc": 13.1, "mins": 30,  "available": True},
        {"slug": "instamart", "price": 88,  "mrp": 99,  "disc": 11.1, "mins": 15,  "available": True},
        {"slug": "amazon",    "price": 84,  "mrp": 99,  "disc": 15.2, "mins": 120, "available": True},
    ],
    "lakme-foundation-30ml": [
        {"slug": "blinkit",   "price": 299, "mrp": 375, "disc": 20.3, "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 310, "mrp": 375, "disc": 17.3, "mins": 10,  "available": True},
        {"slug": "bigbasket", "price": 285, "mrp": 375, "disc": 24,   "mins": 30,  "available": True},
        {"slug": "amazon",    "price": 275, "mrp": 375, "disc": 26.7, "mins": 120, "available": True},
    ],
    "maybelline-mascara-9ml": [
        {"slug": "blinkit",   "price": 349, "mrp": 450, "disc": 22.4, "mins": 10,  "available": True},
        {"slug": "zepto",     "price": 360, "mrp": 450, "disc": 20,   "mins": 10,  "available": True},
        {"slug": "amazon",    "price": 330, "mrp": 450, "disc": 26.7, "mins": 120, "available": True},
    ],
}


@router.post("/seed-prices")
async def seed_static_prices(
    db: AsyncSession = Depends(get_db),
    _key=Depends(_require_seed_key),
):
    """Insert realistic hardcoded prices for all seeded products across platforms."""
    from app.models.platform import Platform
    from app.models.product import Product

    r = await db.execute(select(Platform))
    plat_map = {p.slug: p for p in r.scalars().all()}

    r = await db.execute(select(Product))
    prod_map = {p.slug: p for p in r.scalars().all()}

    inserted = 0
    for prod_slug, price_rows in STATIC_PRICES.items():
        prod = prod_map.get(prod_slug)
        if not prod:
            continue
        # Patch image URL if missing
        img = PRODUCT_IMAGES.get(prod_slug)
        if img and not prod.image_url:
            prod.image_url = img
            prod.thumbnail_url = img
        for row in price_rows:
            plat = plat_map.get(row["slug"])
            if not plat:
                continue
            await _upsert_price(db, prod.id, plat.id, {
                "price": row["price"], "mrp": row["mrp"],
                "disc": row["disc"], "available": row["available"],
                "mins": row["mins"], "pid": None, "url": None, "image_url": None,
            })
            inserted += 1

    await db.commit()
    await cache_delete_pattern("featured:*")
    return {"status": "done", "prices_inserted": inserted, "products": len(STATIC_PRICES)}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/seed")
async def start_seed(
    background_tasks: BackgroundTasks,
    _key=Depends(_require_seed_key),
):
    """Start the full seed + multi-platform scrape job in background."""
    if _seed_state["running"]:
        return {"status": "already_running", "state": _seed_state}
    background_tasks.add_task(_run_seed)
    return {"status": "started", "message": "Poll GET /api/v1/setup/seed-status for progress"}


@router.get("/seed-status")
async def seed_status(_key=Depends(_require_seed_key)):
    """Check progress of the running seed job."""
    return _seed_state


# ── Bulk price import ─────────────────────────────────────────────────────────

class ScrapedItem(BaseModel):
    platform: str
    name: str
    price: float
    mrp: float = 0.0
    image_url: str = ""
    unit: str = ""
    in_stock: bool = True
    query: str = ""


class BulkImportRequest(BaseModel):
    items: List[ScrapedItem]


QUERY_TO_CATEGORY = {
    "milk":             "dairy-breakfast",
    "bread":            "bakery",
    "eggs":             "dairy-breakfast",
    "butter":           "dairy-breakfast",
    "rice":             "staples",
    "atta wheat flour": "staples",
    "sugar":            "staples",
    "salt":             "staples",
    "cooking oil":      "oils-spices",
    "dal lentils":      "staples",
    "tomato":           "fruits-vegetables",
    "onion":            "fruits-vegetables",
    "potato":           "fruits-vegetables",
    "banana":           "fruits-vegetables",
    "apple":            "fruits-vegetables",
    "yogurt curd":      "dairy-breakfast",
    "cheese":           "dairy-breakfast",
    "paneer":           "dairy-breakfast",
    "tea":              "snacks-drinks",
    "coffee":           "snacks-drinks",
    "biscuits":         "snacks-drinks",
    "chips":            "snacks-drinks",
    "noodles":          "snacks-drinks",
    "soap":             "personal-care",
    "shampoo":          "personal-care",
    "toothpaste":       "personal-care",
    "detergent":        "household",
}


@router.post("/import-prices", status_code=200)
async def import_prices(
    body: BulkImportRequest,
    db: AsyncSession = Depends(get_db),
    _key=Depends(_require_seed_key),
):
    """
    Bulk-import scraped product prices into the database.
    Upserts products and platform_prices rows.
    Protected by x-seed-key header.
    """
    import re as _re
    from datetime import timezone as _tz

    def _slugify(text: str) -> str:
        return _re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

    # Load all platforms
    plat_res = await db.execute(select(Platform))
    platforms = {p.slug: p for p in plat_res.scalars().all()}

    # Load all categories
    cat_res = await db.execute(select(Category))
    categories = {c.slug: c for c in cat_res.scalars().all()}

    # Fallback category
    fallback_cat = categories.get("snacks-drinks") or next(iter(categories.values()), None)

    saved = 0
    skipped = 0
    now = datetime.now(_tz.utc)

    for item in body.items:
        platform = platforms.get(item.platform)
        if not platform:
            skipped += 1
            continue

        name = item.name.strip()[:255]
        if not name or item.price <= 0:
            skipped += 1
            continue

        cat_slug = QUERY_TO_CATEGORY.get(item.query, "")
        category = categories.get(cat_slug) or fallback_cat

        prod_slug = _slugify(name)[:255]
        res = await db.execute(select(Product).where(Product.slug == prod_slug))
        product = res.scalar_one_or_none()
        if not product:
            product = Product(
                id=uuid.uuid4(),
                name=name,
                slug=prod_slug,
                category_id=category.id if category else None,
                image_url=item.image_url or None,
                unit=item.unit or None,
                is_active=True,
                is_featured=True,
            )
            db.add(product)
            await db.flush()
        else:
            if not product.image_url and item.image_url:
                product.image_url = item.image_url
            if not product.unit and item.unit:
                product.unit = item.unit

        # Upsert platform price
        pp_res = await db.execute(
            select(PlatformPrice).where(
                PlatformPrice.product_id == product.id,
                PlatformPrice.platform_id == platform.id,
            )
        )
        pp = pp_res.scalar_one_or_none()
        mrp_val = float(item.mrp) if item.mrp > 0 else float(item.price)
        price_val = float(item.price)
        discount = round((mrp_val - price_val) / mrp_val * 100, 1) if mrp_val > price_val else 0.0

        if pp:
            pp.price = price_val
            pp.original_price = mrp_val if mrp_val > price_val else None
            pp.discount_percent = discount
            pp.is_available = item.in_stock
            pp.last_updated = now
            if item.image_url:
                pp.platform_image_url = item.image_url
        else:
            pp = PlatformPrice(
                id=uuid.uuid4(),
                product_id=product.id,
                platform_id=platform.id,
                price=price_val,
                original_price=mrp_val if mrp_val > price_val else None,
                discount_percent=discount,
                is_available=item.in_stock,
                last_updated=now,
                platform_image_url=item.image_url or None,
                source="scrape",
            )
            db.add(pp)

        saved += 1

    await db.commit()

    # Clear featured cache
    await cache_delete_pattern("featured:*")
    await cache_delete_pattern("products:*")

    return {"status": "ok", "saved": saved, "skipped": skipped, "total": len(body.items)}


class AdminCreate(BaseModel):
    email: str
    password: str
    full_name: str = "Admin"


@router.post("/create-admin", status_code=201)
async def create_admin(
    body: AdminCreate,
    db: AsyncSession = Depends(get_db),
    _key=Depends(_require_seed_key),
):
    """Create or promote a user to admin. Protected by x-seed-key header."""
    from app.services.auth_service import create_user, get_user_by_email
    existing = await get_user_by_email(db, body.email)
    if existing:
        existing.is_admin = True
        await db.commit()
        return {"status": "promoted", "email": existing.email, "id": str(existing.id)}
    user = await create_user(db, body.email, body.password, body.full_name)
    user.is_admin = True
    await db.commit()
    return {"status": "created", "email": user.email, "id": str(user.id)}


# ── Load bundled scraped data ─────────────────────────────────────────────────

@router.post("/load-scraped", status_code=200)
async def load_scraped_data(
    db: AsyncSession = Depends(get_db),
    _key=Depends(_require_seed_key),
):
    """
    Load the bundled scraped_prices.json (1,328 real products from Blinkit + Zepto)
    into the database. Upserts products and platform_prices.
    Protected by x-seed-key header.
    Call once after deploy: POST /api/v1/setup/load-scraped
    """
    import json as _json
    import os as _os
    import re as _re
    import traceback as _tb

    try:
        return await _do_load_scraped(db)
    except Exception as _exc:
        _tb.print_exc()
        raise HTTPException(status_code=500, detail=f"load-scraped error: {type(_exc).__name__}: {_exc}")


async def _do_load_scraped(db: AsyncSession):
    import json as _json
    import os as _os
    import re as _re

    # Find the data file relative to this module
    _here = _os.path.dirname(_os.path.abspath(__file__))
    _data_file = _os.path.join(_here, "..", "..", "data", "scraped_prices.json")
    _data_file = _os.path.normpath(_data_file)

    if not _os.path.exists(_data_file):
        raise HTTPException(status_code=404, detail=f"Data file not found: {_data_file}")

    with open(_data_file) as f:
        items = _json.load(f)

    def _slugify(text: str) -> str:
        return _re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

    # Load all platforms
    plat_res = await db.execute(select(Platform))
    platforms = {p.slug: p for p in plat_res.scalars().all()}

    # Load all categories
    cat_res = await db.execute(select(Category))
    categories = {c.slug: c for c in cat_res.scalars().all()}

    fallback_cat = categories.get("snacks-drinks") or next(iter(categories.values()), None)

    saved = 0
    skipped = 0

    for item in items:
        platform = platforms.get(item.get("platform", ""))
        if not platform:
            skipped += 1
            continue

        name = (item.get("name") or "").strip()[:255]
        price = float(item.get("price") or 0)
        if not name or price <= 0:
            skipped += 1
            continue

        mrp = float(item.get("mrp") or price)
        image_url = item.get("image_url") or None
        unit = (item.get("unit") or "")[:100]
        query = item.get("query", "")

        cat_slug = QUERY_TO_CATEGORY.get(query, "")
        category = categories.get(cat_slug) or fallback_cat

        prod_slug = _slugify(name)[:255]
        res = await db.execute(select(Product).where(Product.slug == prod_slug))
        product = res.scalar_one_or_none()
        if not product:
            product = Product(
                id=uuid.uuid4(),
                slug=prod_slug,
                name=name,
                unit=unit or None,
                image_url=image_url,
                thumbnail_url=image_url,
                category_id=category.id if category else None,
                is_active=True,
                is_featured=False,
            )
            db.add(product)
            await db.flush()
        else:
            # Update image if missing
            if image_url and not product.image_url:
                product.image_url = image_url
                product.thumbnail_url = image_url

        # Upsert platform price
        pp_res = await db.execute(
            select(PlatformPrice).where(
                PlatformPrice.product_id == product.id,
                PlatformPrice.platform_id == platform.id,
            )
        )
        pp = pp_res.scalars().first()
        disc = round(((mrp - price) / mrp) * 100, 1) if mrp > price else 0.0
        if pp:
            pp.price = price
            pp.original_price = mrp
            pp.discount_percent = disc
            pp.discount_label = f"{int(disc)}% OFF" if disc >= 1 else None
            pp.is_available = True
            pp.platform_image_url = image_url
        else:
            pp = PlatformPrice(
                id=uuid.uuid4(),
                product_id=product.id,
                platform_id=platform.id,
                price=price,
                original_price=mrp,
                discount_percent=disc,
                discount_label=f"{int(disc)}% OFF" if disc >= 1 else None,
                is_available=True,
                platform_image_url=image_url,
                source="scrape",
            )
            db.add(pp)
        saved += 1

    await db.commit()
    await cache_delete_pattern("featured:*")
    await cache_delete_pattern("products:*")

    return {"status": "ok", "saved": saved, "skipped": skipped, "total": len(items)}


@router.post("/mark-featured", status_code=200)
async def mark_featured_products(
    limit: int = 60,
    db: AsyncSession = Depends(get_db),
    _key=Depends(_require_seed_key),
):
    """Mark top N products (by platform price count) as featured for homepage display."""
    from sqlalchemy import func

    # Unfeature all currently featured products
    await db.execute(
        update(Product).where(Product.is_featured == True).values(is_featured=False)
    )

    # Pick top `limit` products that have the most platform prices
    subq = (
        select(PlatformPrice.product_id, func.count(PlatformPrice.id).label("cnt"))
        .group_by(PlatformPrice.product_id)
        .order_by(func.count(PlatformPrice.id).desc())
        .limit(limit)
        .subquery()
    )
    result = await db.execute(select(subq.c.product_id))
    top_ids = [row[0] for row in result.fetchall()]

    if not top_ids:
        return {"status": "ok", "featured": 0, "message": "No products with prices found"}

    await db.execute(
        update(Product).where(Product.id.in_(top_ids)).values(is_featured=True)
    )
    await db.commit()

    await cache_delete_pattern("featured:*")
    await cache_delete_pattern("products:*")

    return {"status": "ok", "featured": len(top_ids), "limit": limit}
