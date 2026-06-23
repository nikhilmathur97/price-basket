#!/usr/bin/env python3
"""
scrape_all_platforms_bulk.py
============================
Bulk scraper that fetches product data from ALL 5 platforms for a comprehensive
list of 297+ product queries and saves results to /tmp/scraped_bulk.json.

Platforms: Blinkit, Zepto, BigBasket, Instamart, JioMart

Usage:
    cd /path/to/project
    source backend/.venv/bin/activate
    python3 scripts/scrape_all_platforms_bulk.py

Output: /tmp/scraped_bulk.json  (also saves to backend/app/data/scraped_prices.json)
"""
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import Optional

# ── Path setup ─────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# ── Load .env ─────────────────────────────────────────────────────────────────
for env_path in ["backend/.env", ".env"]:
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())
        print(f"  Loaded env from {env_path}")
        break

# ── Comprehensive product query list (297 queries across 12 categories) ───────
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

# Flatten all queries with category info
ALL_QUERIES = []
for category, queries in PRODUCT_QUERIES.items():
    for q in queries:
        ALL_QUERIES.append({"query": q, "category": category})

print(f"Total queries to scrape: {len(ALL_QUERIES)}")

# ── Platform scrapers ─────────────────────────────────────────────────────────
PLATFORMS_TO_SCRAPE = [
    "blinkit",
    "zepto",
    "bigbasket",
    "instamart",
    "jiomart",
]

# ── Scraping functions ────────────────────────────────────────────────────────

async def scrape_blinkit_bulk(queries: list[str]) -> list[dict]:
    """Scrape multiple products from Blinkit."""
    from app.scrapers.blinkit_scraper import BlinkitScraper
    scraper = BlinkitScraper()
    results = []

    for query in queries:
        try:
            print(f"  [Blinkit] Scraping: {query}")
            # Use internal playwright method to get ALL products, not just first
            products = await _blinkit_search(scraper, query)
            for p in products[:5]:  # Top 5 per query
                results.append({
                    "platform": "blinkit",
                    "name": p["name"],
                    "price": p["price"],
                    "mrp": p["mrp"],
                    "image_url": p.get("image_url", ""),
                    "unit": p.get("unit", ""),
                    "in_stock": p.get("in_stock", True),
                    "query": query,
                    "pid": p.get("pid", ""),
                    "url": p.get("url", ""),
                })
            await asyncio.sleep(1.5)
        except Exception as e:
            print(f"  [Blinkit] Error for '{query}': {e}")
            await asyncio.sleep(2)

    await scraper.close()
    return results


async def _blinkit_search(scraper, query: str) -> list[dict]:
    """Get all products from Blinkit search (not just first)."""
    from app.scrapers.playwright_pool import get_browser
    from app.scrapers.blinkit_scraper import _parse_snippets
    from urllib.parse import quote_plus

    lat = "28.6139"
    lon = "77.2090"
    captured = []

    async with get_browser() as browser:
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-IN",
            geolocation={"latitude": float(lat), "longitude": float(lon)},
            permissions=["geolocation"],
        )
        try:
            page = await context.new_page()

            async def on_response(response):
                if (
                    "blinkit.com/v1/layout/search" in response.url
                    and response.status == 200
                ):
                    try:
                        data = await response.json()
                        captured.append(data)
                    except Exception:
                        pass

            page.on("response", on_response)
            await page.goto(
                f"https://blinkit.com/s/?q={quote_plus(query)}",
                wait_until="networkidle",
                timeout=30_000,
            )
            await asyncio.sleep(2)
            await page.close()
        finally:
            await context.close()

    all_products = []
    for data in captured:
        products = _parse_snippets(data)
        all_products.extend(products)
    return all_products


async def _zepto_search(query: str) -> list[dict]:
    """Get all products from Zepto search."""
    from app.scrapers.playwright_pool import get_browser
    from app.scrapers.zepto_scraper import _parse_layout
    from urllib.parse import quote_plus

    captured = []

    async with get_browser() as browser:
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "Version/17.0 Mobile/15E148 Safari/604.1"
            ),
            locale="en-IN",
            geolocation={"latitude": 28.6139, "longitude": 77.2090},
            permissions=["geolocation"],
        )
        try:
            page = await context.new_page()

            async def on_response(response):
                if (
                    "user-search-service/api/v3/search" in response.url
                    and response.status == 200
                ):
                    try:
                        data = await response.json()
                        captured.append(data)
                    except Exception:
                        pass

            page.on("response", on_response)
            await page.goto(
                f"https://www.zeptonow.com/search?query={quote_plus(query)}",
                wait_until="networkidle",
                timeout=30_000,
            )
            await asyncio.sleep(3)
            await page.close()
        finally:
            await context.close()

    all_products = []
    for data in captured:
        products = _parse_layout(data)
        all_products.extend(products)
    return all_products


async def scrape_zepto_bulk(queries: list[str]) -> list[dict]:
    """Scrape multiple products from Zepto."""
    results = []
    for query in queries:
        try:
            print(f"  [Zepto] Scraping: {query}")
            products = await _zepto_search(query)
            for p in products[:5]:
                results.append({
                    "platform": "zepto",
                    "name": p["name"],
                    "price": p["price"],
                    "mrp": p["mrp"],
                    "image_url": p.get("image_url", ""),
                    "unit": p.get("unit", ""),
                    "in_stock": p.get("in_stock", True),
                    "query": query,
                    "pid": p.get("pid", ""),
                    "url": p.get("url", ""),
                })
            await asyncio.sleep(1.5)
        except Exception as e:
            print(f"  [Zepto] Error for '{query}': {e}")
            await asyncio.sleep(2)
    return results


async def scrape_platform_generic(platform_slug: str, queries: list[str]) -> list[dict]:
    """Generic scraper using the existing scraper registry."""
    import uuid
    from app.scrapers import get_scraper

    scraper = get_scraper(platform_slug)
    if not scraper:
        print(f"  No scraper found for {platform_slug}")
        return []

    results = []
    for query in queries:
        try:
            print(f"  [{platform_slug}] Scraping: {query}")
            fake_id = uuid.uuid4()
            price_data = await scraper.fetch_price(fake_id, product_name=query)
            if price_data and price_data.price > 0:
                results.append({
                    "platform": platform_slug,
                    "name": query,  # Use query as name since we only get price back
                    "price": price_data.price,
                    "mrp": price_data.original_price or price_data.price,
                    "image_url": price_data.platform_image_url or "",
                    "unit": "",
                    "in_stock": price_data.is_available,
                    "query": query,
                    "pid": price_data.platform_product_id or "",
                    "url": price_data.platform_product_url or "",
                    "source": price_data.source,
                })
            await asyncio.sleep(1.5)
        except Exception as e:
            print(f"  [{platform_slug}] Error for '{query}': {e}")
            await asyncio.sleep(2)

    return results


# ── Main scraping orchestrator ────────────────────────────────────────────────

async def main():
    print("\n🚀 PriceBasket Bulk Scraper")
    print("=" * 60)
    print(f"Scraping {len(ALL_QUERIES)} queries × {len(PLATFORMS_TO_SCRAPE)} platforms")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    all_results = []
    start_time = time.time()

    # Extract just query strings
    query_strings = [item["query"] for item in ALL_QUERIES]

    # Scrape Blinkit (has bulk support) — all queries
    print(f"\n📦 Scraping Blinkit ({len(query_strings)} queries)...")
    try:
        blinkit_results = await scrape_blinkit_bulk(query_strings)
        all_results.extend(blinkit_results)
        print(f"  ✅ Blinkit: {len(blinkit_results)} products")
    except Exception as e:
        print(f"  ❌ Blinkit failed: {e}")

    # Save intermediate results
    _save_results(all_results)

    # Scrape Zepto (has bulk support) — all queries
    print(f"\n📦 Scraping Zepto ({len(query_strings)} queries)...")
    try:
        zepto_results = await scrape_zepto_bulk(query_strings)
        all_results.extend(zepto_results)
        print(f"  ✅ Zepto: {len(zepto_results)} products")
    except Exception as e:
        print(f"  ❌ Zepto failed: {e}")

    _save_results(all_results)

    # Scrape other platforms using generic scraper — up to 50 queries each
    for platform in ["bigbasket", "instamart", "jiomart"]:
        print(f"\n📦 Scraping {platform} (up to 50 queries)...")
        try:
            results = await scrape_platform_generic(platform, query_strings[:50])
            all_results.extend(results)
            print(f"  ✅ {platform}: {len(results)} products")
        except Exception as e:
            print(f"  ❌ {platform} failed: {e}")
        _save_results(all_results)
        await asyncio.sleep(3)

    # Final save
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"✅ Scraping complete!")
    print(f"   Total products: {len(all_results)}")
    print(f"   Time elapsed: {elapsed:.1f}s")

    by_platform = {}
    for r in all_results:
        p = r.get("platform", "unknown")
        by_platform[p] = by_platform.get(p, 0) + 1
    for p, c in sorted(by_platform.items()):
        print(f"   {p}: {c} products")

    _save_results(all_results, final=True)
    print(f"\n📁 Saved to /tmp/scraped_bulk.json")
    print(f"📁 Also saved to backend/app/data/scraped_prices.json")


def _save_results(results: list[dict], final: bool = False):
    """Save results to JSON files."""
    # Save to /tmp
    tmp_path = "/tmp/scraped_bulk.json"
    with open(tmp_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    if final:
        # Also update the main scraped_prices.json
        data_path = os.path.join(
            os.path.dirname(__file__), "..", "backend", "app", "data", "scraped_prices.json"
        )
        # Merge with existing data
        existing = []
        if os.path.exists(data_path):
            try:
                with open(data_path) as f:
                    existing = json.load(f)
            except Exception:
                pass

        # Deduplicate: keep new results, remove old ones for same platform+name
        existing_keys = {(r.get("platform"), r.get("name")) for r in results}
        filtered_existing = [
            r for r in existing
            if (r.get("platform"), r.get("name")) not in existing_keys
        ]
        merged = results + filtered_existing

        with open(data_path, "w") as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
        print(f"   Merged {len(results)} new + {len(filtered_existing)} existing = {len(merged)} total")


if __name__ == "__main__":
    asyncio.run(main())
