#!/usr/bin/env python3
"""
scrape_blinkit_zepto_http.py
============================
Pure HTTP scraper (no browser/Playwright needed) for Blinkit + Zepto.
Scrapes 300+ product queries across all quick commerce categories.
Saves results to backend/app/data/scraped_prices.json (appends/merges).

Usage:
    python3 scripts/scrape_blinkit_zepto_http.py

Output: backend/app/data/scraped_prices.json
"""
import asyncio
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from typing import Optional

import httpx

# ── Output file ───────────────────────────────────────────────────────────────
OUTPUT_FILE = "backend/app/data/scraped_prices.json"

# ── Blinkit config ────────────────────────────────────────────────────────────
BLINKIT_SEARCH = "https://blinkit.com/v6/listing/products"
BLINKIT_LAT    = "28.6139"   # Delhi
BLINKIT_LON    = "77.2090"

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

def _blinkit_headers(query: str, idx: int = 0) -> dict:
    return {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "app_client": "consumer_web",
        "app_version": "1010101",
        "auth_key": "c8f3ac2b-a3c3-4d4e-a8f3-ac2ba3c3d4e5",
        "Content-Type": "application/json",
        "lat": BLINKIT_LAT,
        "lon": BLINKIT_LON,
        "Referer": f"https://blinkit.com/s/?q={query.replace(' ', '+')}",
        "User-Agent": USER_AGENTS[idx % len(USER_AGENTS)],
        "web_app_version": "1010101",
    }

def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

def _img_url(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    if raw.startswith("//"):
        return "https:" + raw
    return f"https://cdn.grofers.com/da/cms-assets/cms/product/{raw}"

async def _blinkit_search(client: httpx.AsyncClient, query: str, attempt: int = 0) -> list[dict]:
    params = {
        "start": "0",
        "size":  "20",
        "search_type": "7",
        "q": query,
    }
    try:
        r = await client.get(
            BLINKIT_SEARCH,
            params=params,
            headers=_blinkit_headers(query, attempt),
            timeout=15,
        )
        if r.status_code != 200:
            return []
        data = r.json()
        objects = data.get("objects", [])
        products = []
        for obj in objects:
            if obj.get("type") != "product_list":
                continue
            for p in obj.get("objects", []):
                products.append(p)
        return products
    except Exception:
        return []

def _parse_blinkit(raw: dict, query: str, cat_slug: str) -> Optional[dict]:
    name = raw.get("name", "").strip()
    if not name:
        return None
    price = raw.get("price", 0) or raw.get("sale_price", 0)
    mrp   = raw.get("mrp", 0) or price
    if not price or price <= 0:
        return None
    img = _img_url(raw.get("image_url") or raw.get("thumb_image"))
    unit = raw.get("unit", "") or raw.get("quantity", "")
    return {
        "name":      name,
        "platform":  "blinkit",
        "query":     query,
        "category":  cat_slug,
        "price":     float(price),
        "mrp":       float(mrp),
        "image_url": img,
        "unit":      str(unit) if unit else "",
        "in_stock":  bool(raw.get("is_available", True)),
        "scraped_at": datetime.utcnow().isoformat(),
    }

# ── Zepto config ──────────────────────────────────────────────────────────────
ZEPTO_SEARCH = "https://api.zeptonow.com/api/v3/search"
ZEPTO_STORE_ID = "17560ae9-e5b6-4d2e-b9e0-c7e3b3a3d4e5"  # Delhi store

def _zepto_headers() -> dict:
    return {
        "Accept": "application/json",
        "Accept-Language": "en-IN",
        "appVersion": "12.0.0",
        "Content-Type": "application/json",
        "deviceId": "web-" + "".join(random.choices("abcdef0123456789", k=16)),
        "latitude": "28.6139",
        "longitude": "77.2090",
        "Origin": "https://www.zeptonow.com",
        "Referer": "https://www.zeptonow.com/",
        "storeId": ZEPTO_STORE_ID,
        "User-Agent": USER_AGENTS[0],
    }

async def _zepto_search(client: httpx.AsyncClient, query: str, cat_slug: str) -> list[dict]:
    payload = {
        "query": query,
        "pageNumber": 0,
        "pageSize": 20,
        "intent": False,
        "isRecommendation": False,
    }
    try:
        r = await client.post(
            ZEPTO_SEARCH,
            json=payload,
            headers=_zepto_headers(),
            timeout=15,
        )
        if r.status_code != 200:
            return []
        data = r.json()
        items = []
        for section in data.get("sections", []):
            for item in section.get("items", []):
                product = item.get("product", {}) or item.get("productResponse", {})
                if not product:
                    continue
                name = product.get("name", "").strip()
                price = product.get("discountedSellingPrice", 0) or product.get("sellingPrice", 0)
                mrp   = product.get("mrp", 0) or price
                if not name or not price or price <= 0:
                    continue
                img = product.get("imgUrl", "") or product.get("imageUrl", "")
                if img and not img.startswith("http"):
                    img = "https://cdn.zeptonow.com/production//tr:w-600,ar-1-1,dpr-1,f-auto,q-80/" + img
                unit = product.get("unitQuantity", "") or product.get("quantity", "")
                items.append({
                    "name":      name,
                    "platform":  "zepto",
                    "query":     query,
                    "category":  cat_slug,
                    "price":     float(price) / 100 if float(price) > 1000 else float(price),
                    "mrp":       float(mrp) / 100 if float(mrp) > 1000 else float(mrp),
                    "image_url": img or None,
                    "unit":      str(unit) if unit else "",
                    "in_stock":  product.get("available", True),
                    "scraped_at": datetime.utcnow().isoformat(),
                })
        return items
    except Exception:
        return []

# ── Comprehensive query list ───────────────────────────────────────────────────
PRODUCT_QUERIES = {
    "dairy-breakfast": [
        "Amul Taaza Toned Milk 500ml", "Amul Gold Full Cream Milk 1L",
        "Mother Dairy Toned Milk 500ml", "Mother Dairy Full Cream Milk 1L",
        "Amul Butter 500g", "Amul Butter 100g",
        "Amul Paneer 200g", "Amul Paneer 500g",
        "Mother Dairy Curd 400g", "Mother Dairy Curd 1kg",
        "Epigamia Greek Yogurt 400g", "Epigamia Greek Yogurt Strawberry",
        "Farm Fresh Eggs 12 pcs", "Country Delight Eggs 6pcs",
        "Amul Cheese Slices 200g", "Amul Processed Cheese 200g",
        "Nandini Milk 1L", "Nestle a+ Curd 400g",
        "Kelloggs Corn Flakes 500g", "Kelloggs Chocos 375g",
        "Quaker Oats 500g", "Saffola Oats 500g",
        "Horlicks Classic Malt 500g", "Bournvita 500g",
        "Nescafe Classic Coffee 50g", "Bru Instant Coffee 50g",
        "Tata Tea Gold 500g", "Red Label Tea 500g",
        "Dabur Honey 500g", "Patanjali Honey 500g",
        "Kissan Mixed Fruit Jam 500g", "Britannia Bread 400g",
        "Harvest Gold Bread 400g", "Modern Bread 400g",
        "Amul Mozzarella Cheese 200g", "Amul Cream 250ml",
        "Milkmaid Condensed Milk 400g", "Nestle Milkmaid 400g",
    ],
    "fruits-vegetables": [
        "Fresh Onion 1kg", "Red Tomato 500g",
        "Banana Robusta 6pcs", "Baby Spinach 250g",
        "Shimla Apple 4pcs", "Fresh Potato 1kg",
        "Fresh Lemon 6pcs", "Green Capsicum 250g",
        "Carrot 500g", "Cucumber 500g",
        "Cauliflower 1 piece", "Broccoli 250g",
        "Grapes Green 500g", "Pomegranate 500g",
        "Papaya 1kg", "Pineapple 1 piece",
        "Sweet Corn 2pcs", "Green Peas 500g",
        "Bitter Gourd 500g", "Bottle Gourd 1 piece",
        "Coriander Leaves 100g", "Mint Leaves 100g",
        "Ginger 100g", "Garlic 100g",
        "Green Chilli 100g", "Curry Leaves 50g",
    ],
    "snacks-drinks": [
        "Lays Magic Masala 26g", "Lays Classic Salted 26g",
        "Kurkure Masala Munch 90g", "Kurkure Triangles 90g",
        "Haldirams Aloo Bhujia 200g", "Haldirams Moong Dal 200g",
        "Maggi 2 Minute Noodles 4 pack", "Yippee Noodles 4 pack",
        "Coca Cola 750ml", "Pepsi 750ml",
        "Sprite 750ml", "Thums Up 750ml",
        "Tropicana Orange Juice 1L", "Real Orange Juice 1L",
        "Red Bull Energy Drink 250ml", "Monster Energy 500ml",
        "Cadbury Dairy Milk 40g", "Cadbury Dairy Milk Silk 60g",
        "Oreo Chocolate Cream 100g", "Oreo Vanilla 100g",
        "Parle G Biscuit 800g", "Parle G 100g",
        "Britannia Good Day Butter Cookies 150g",
        "Britannia Marie Gold 250g",
        "Paper Boat Aamras 200ml", "Paper Boat Jaljeera 200ml",
        "Maaza Mango 600ml", "Frooti 200ml",
        "Minute Maid Pulpy Orange 400ml",
        "Bisleri Water 1L", "Kinley Water 1L",
        "Lay's American Style Cream Onion 26g",
        "Doritos Nacho Cheese 28g",
        "Pringles Original 107g",
        "KitKat 4 Finger 41.5g",
        "5 Star Chocolate 40g",
        "Munch Chocolate 35g",
    ],
    "staples": [
        "Aashirvaad Whole Wheat Atta 5kg", "Aashirvaad Atta 10kg",
        "Pillsbury Chakki Fresh Atta 5kg", "Pillsbury Atta 10kg",
        "India Gate Basmati Rice 1kg", "India Gate Basmati Rice 5kg",
        "Daawat Super Basmati Rice 5kg", "Daawat Basmati Rice 1kg",
        "Tata Sampann Toor Dal 1kg", "Tata Sampann Chana Dal 1kg",
        "Tata Sampann Moong Dal 1kg", "Tata Sampann Masoor Dal 1kg",
        "Tata Salt 1kg", "Catch Salt 1kg",
        "Refined Sugar 1kg", "Patanjali Sugar 1kg",
        "Maggi Tomato Ketchup 900g", "Kissan Fresh Tomato Ketchup 500g",
        "Nature Fresh Maida 1kg", "Sona Masoori Rice 5kg",
        "Rajdhani Besan 500g", "MDH Besan 500g",
        "Patanjali Atta 5kg", "Fortune Chakki Fresh Atta 5kg",
        "Kohinoor Basmati Rice 1kg", "Lal Qilla Basmati Rice 1kg",
        "Tata Sampann Rajma 500g", "Tata Sampann Kabuli Chana 500g",
        "Aashirvaad Multigrain Atta 5kg",
        "Saffola Masala Oats 500g",
        "Quaker Oats Masala 400g",
    ],
    "oils-spices": [
        "Fortune Sunflower Oil 1L", "Fortune Sunflower Oil 5L",
        "Saffola Gold Blended Oil 1L", "Saffola Gold 5L",
        "Amul Pure Ghee 500ml", "Amul Pure Ghee 1L",
        "Patanjali Cow Ghee 500ml", "Aashirvaad Svasti Ghee 500ml",
        "Figaro Olive Oil 500ml", "Borges Olive Oil 500ml",
        "MTR Turmeric Powder 100g", "Everest Turmeric Powder 100g",
        "MTR Red Chilli Powder 100g", "Everest Red Chilli Powder 100g",
        "Everest Garam Masala 100g", "MDH Garam Masala 100g",
        "MDH Chole Masala 100g", "Everest Chole Masala 100g",
        "Catch Black Pepper Powder 50g", "MDH Black Pepper 50g",
        "Tata Sampann Cumin Seeds 100g", "Everest Cumin Seeds 100g",
        "MDH Kitchen King Masala 100g", "Everest Kitchen King 100g",
        "Patanjali Mustard Oil 1L", "Fortune Mustard Oil 1L",
        "Dhara Refined Oil 1L", "Gemini Sunflower Oil 1L",
        "Tata Sampann Coriander Powder 100g",
        "MDH Rajma Masala 100g",
        "Everest Pav Bhaji Masala 100g",
        "MDH Biryani Masala 50g",
    ],
    "household": [
        "Surf Excel Easy Wash 1kg", "Surf Excel Matic 1kg",
        "Ariel Matic Front Load 1kg", "Ariel Matic Top Load 1kg",
        "Vim Dishwash Liquid 750ml", "Pril Dishwash Gel 500ml",
        "Harpic Power Plus 500ml", "Harpic Bathroom Cleaner 500ml",
        "Lizol Surface Cleaner 500ml", "Colin Glass Cleaner 500ml",
        "Scotch Brite Scrub Pad 3pcs", "Scotch Brite Sponge",
        "Dettol Antiseptic Liquid 250ml", "Savlon Antiseptic 200ml",
        "Domex Toilet Cleaner 500ml", "Toilet Duck 500ml",
        "Rin Detergent Powder 1kg", "Wheel Detergent 1kg",
        "Comfort Fabric Conditioner 860ml", "Ezee Liquid Detergent 500ml",
        "Mortein Mosquito Coil 10pcs", "Good Knight Liquid Refill",
        "Odonil Room Freshener 75g", "Air Wick Freshener 250ml",
        "Garbage Bags 30pcs", "Cello Wrap Cling Film",
        "Vim Bar 200g", "Rin Bar 250g",
        "Tide Detergent Powder 1kg",
        "Henko Detergent 1kg",
    ],
    "personal-care": [
        "Colgate MaxFresh Toothpaste 200g", "Colgate Strong Teeth 200g",
        "Pepsodent Toothpaste 200g", "Sensodyne Toothpaste 70g",
        "Dove Beauty Bar Soap 75g", "Dove Moisturizing Cream 75g",
        "Head Shoulders Anti Dandruff Shampoo 340ml",
        "Pantene Smooth Shampoo 340ml", "Clinic Plus Shampoo 340ml",
        "Dettol Original Soap 75g", "Dettol Soap 4 pack",
        "Lux Soft Touch Soap 75g", "Lux Soap 4 pack",
        "Vaseline Body Lotion 400ml", "Vaseline Intensive Care 400ml",
        "Nivea Soft Moisturizing Cream 200ml", "Nivea Body Lotion 400ml",
        "Gillette Mach3 Razor", "Gillette Venus Razor",
        "Whisper Ultra Soft Pads", "Stayfree Secure Pads",
        "Himalaya Neem Face Wash 100ml", "Himalaya Purifying Neem 150ml",
        "Garnier Micellar Water 400ml", "Pond's Face Wash 100ml",
        "Oral B Toothbrush", "Colgate Toothbrush 3pcs",
        "Parachute Coconut Oil 500ml", "Bajaj Almond Oil 200ml",
        "Sunsilk Shampoo 340ml", "TRESemme Shampoo 340ml",
        "Dove Shampoo 340ml", "Loreal Shampoo 340ml",
        "Axe Deodorant 150ml", "Dove Deodorant 150ml",
        "Fogg Deodorant 150ml", "Park Avenue Deodorant 150ml",
        "Lakme Face Powder", "Maybelline Lipstick",
        "Biotique Bio Honey Gel Face Wash 100ml",
        "Mamaearth Onion Shampoo 250ml",
        "WOW Apple Cider Vinegar Shampoo 300ml",
    ],
    "baby-care": [
        "Pampers Baby Dry Pants Medium 56pcs",
        "Pampers Baby Dry Pants Large 44pcs",
        "Huggies Wonder Pants Medium 56pcs",
        "Huggies Wonder Pants Large 44pcs",
        "Johnson Baby Shampoo 200ml",
        "Johnson Baby Powder 200g",
        "Johnson Baby Lotion 200ml",
        "Cerelac Wheat 300g", "Nestum Rice 300g",
        "Mamy Poko Pants Medium",
        "Himalaya Baby Cream 100ml",
        "Himalaya Baby Shampoo 200ml",
        "Sebamed Baby Lotion 200ml",
    ],
    "meat-seafood": [
        "Licious Fresh Chicken Breast 500g",
        "Licious Chicken Curry Cut 500g",
        "Licious Boneless Chicken 500g",
        "Suguna Fresh Chicken 500g",
        "Fresho Chicken Curry Cut 500g",
        "Country Delight Brown Eggs 6pcs",
        "Licious Mutton Curry Cut 500g",
        "Licious Fish Rohu 500g",
        "Licious Prawns 250g",
    ],
    "frozen-ready": [
        "McCain French Fries 420g",
        "McCain Smiles 420g",
        "Amul Pizza Base 200g",
        "Haldirams Dal Makhani 300g",
        "MTR Ready to Eat Dal Makhani 300g",
        "MTR Ready to Eat Palak Paneer 300g",
        "Gits Dal Makhani 300g",
        "Gits Paneer Butter Masala 300g",
        "ITC Master Chef Frozen Peas 500g",
        "Safal Frozen Green Peas 500g",
        "Kwality Walls Cornetto 120ml",
        "Amul Vanilla Ice Cream 1L",
        "Baskin Robbins Ice Cream 500ml",
    ],
    "pharma-wellness": [
        "Dettol Hand Sanitizer 200ml",
        "Savlon Hand Sanitizer 200ml",
        "Disprin Tablet 10pcs",
        "Crocin Pain Relief 10pcs",
        "Volini Spray 55g",
        "Moov Pain Relief Cream 50g",
        "Eno Fruit Salt Regular 100g",
        "Hajmola Regular 120 tablets",
        "Pudin Hara Pearls 10 capsules",
        "Glucon D Orange 400g",
        "Revital H Capsules 30pcs",
        "Centrum Multivitamin 30 tablets",
    ],
    "pet-care": [
        "Pedigree Adult Dog Food 1.2kg",
        "Whiskas Adult Cat Food 1.2kg",
        "Drools Dog Food 1.2kg",
        "Royal Canin Dog Food 1kg",
        "Purina Dog Chow 1.2kg",
        "Pedigree Dentastix Dog Treats",
        "Whiskas Tuna Cat Treats",
    ],
    "electronics-accessories": [
        "Duracell AA Batteries 4pcs",
        "Energizer AA Batteries 4pcs",
        "Syska LED Bulb 9W",
        "Philips LED Bulb 9W",
        "Havells LED Bulb 9W",
        "Portronics USB Cable",
        "Boat USB Cable 1m",
    ],
}

# ── Main scraping logic ────────────────────────────────────────────────────────
async def scrape_all() -> list[dict]:
    all_results = []
    total_queries = sum(len(v) for v in PRODUCT_QUERIES.values())
    print(f"\n🚀 PriceBasket HTTP Scraper")
    print(f"   Queries: {total_queries} across {len(PRODUCT_QUERIES)} categories")
    print(f"   Platforms: Blinkit + Zepto")
    print(f"   Output: {OUTPUT_FILE}\n")

    sem = asyncio.Semaphore(3)  # max 3 concurrent requests

    async def scrape_query(query: str, cat_slug: str, idx: int) -> list[dict]:
        async with sem:
            results = []
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=15,
                headers={"User-Agent": USER_AGENTS[idx % len(USER_AGENTS)]},
            ) as client:
                # Blinkit
                blinkit_raw = await _blinkit_search(client, query, idx)
                for raw in blinkit_raw[:5]:  # top 5 per query
                    parsed = _parse_blinkit(raw, query, cat_slug)
                    if parsed:
                        results.append(parsed)

                await asyncio.sleep(0.3)

                # Zepto
                zepto_items = await _zepto_search(client, query, cat_slug)
                results.extend(zepto_items[:5])  # top 5 per query

            return results

    query_list = []
    for cat_slug, queries in PRODUCT_QUERIES.items():
        for q in queries:
            query_list.append((q, cat_slug))

    done = 0
    for i, (query, cat_slug) in enumerate(query_list):
        results = await scrape_query(query, cat_slug, i)
        all_results.extend(results)
        done += 1
        if done % 10 == 0 or done == len(query_list):
            blinkit_count = sum(1 for r in all_results if r["platform"] == "blinkit")
            zepto_count   = sum(1 for r in all_results if r["platform"] == "zepto")
            print(f"  [{done:3d}/{len(query_list)}] {query[:40]:40} → {len(results)} items | total: blinkit={blinkit_count} zepto={zepto_count}")
        await asyncio.sleep(0.2)

    return all_results


def merge_and_save(new_results: list[dict]) -> int:
    """Merge new results with existing data, dedup by (name, platform), save."""
    existing = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE) as f:
                existing = json.load(f)
            print(f"\n📂 Loaded {len(existing)} existing items from {OUTPUT_FILE}")
        except Exception:
            existing = []

    # Build dedup key: (slugified_name, platform)
    def key(item):
        name = re.sub(r"[^a-z0-9]+", "-", item.get("name", "").lower()).strip("-")
        return (name, item.get("platform", ""))

    existing_keys = {key(item) for item in existing}
    new_unique = [item for item in new_results if key(item) not in existing_keys]

    merged = existing + new_unique
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Saved {len(merged)} total items ({len(new_unique)} new) to {OUTPUT_FILE}")
    by_platform = {}
    for item in merged:
        p = item.get("platform", "unknown")
        by_platform[p] = by_platform.get(p, 0) + 1
    for p, c in sorted(by_platform.items()):
        print(f"   {p}: {c}")

    return len(new_unique)


if __name__ == "__main__":
    start = time.time()
    results = asyncio.run(scrape_all())

    blinkit = [r for r in results if r["platform"] == "blinkit"]
    zepto   = [r for r in results if r["platform"] == "zepto"]
    print(f"\n📊 Scraped: {len(results)} total ({len(blinkit)} blinkit, {len(zepto)} zepto)")
    print(f"   Time: {time.time()-start:.1f}s")

    new_count = merge_and_save(results)
    print(f"\n🎯 {new_count} new products ready to push to production!")
    print(f"   Run: python3 scripts/push_to_production.py --seed-key YOUR_KEY --file {OUTPUT_FILE}")
