"""
Debug script to find working API endpoints for each platform.
Run: python scripts/debug_apis.py
"""
import asyncio
import json
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


async def test_bigbasket(c: httpx.AsyncClient):
    print("\n=== BIGBASKET ===")
    # Try with 'type' param that was missing
    param_sets = [
        {"slug": "amul milk", "page": 1, "tab": "prd", "listingPageType": "srch", "type": "search"},
        {"slug": "amul-milk", "page": 1, "tab": "prd", "listingPageType": "srch", "type": "search"},
        {"q": "amul milk", "page": 1, "tab": "prd", "listingPageType": "srch", "type": "search"},
        {"slug": "amul milk", "page": 1, "tab": "prd", "listingPageType": "srch"},
    ]
    for params in param_sets:
        r = await c.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params=params,
            headers={
                "x-channel": "BB-WEB",
                "Accept": "application/json",
                "Referer": "https://www.bigbasket.com/ps/?q=amul+milk",
                "Origin": "https://www.bigbasket.com",
                "User-Agent": UA,
            },
        )
        print(f"  params={list(params.keys())}: {r.status_code} | {r.text[:200]}")
        if r.status_code == 200:
            d = r.json()
            products = d.get("tab_info", [{}])[0].get("prod_list") or d.get("products") or []
            print(f"  Products: {len(products)}")
            if products:
                print(f"  First: {products[0].get('name', '?')}")
            break

    # Old endpoint
    print("  --- old endpoint ---")
    r = await c.get(
        "https://www.bigbasket.com/product/get-products/",
        params={"slug": "amul-gold-milk", "page": 1},
        headers={
            "x-channel": "BB-WEB",
            "Accept": "application/json",
            "User-Agent": UA,
            "Referer": "https://www.bigbasket.com/",
        },
    )
    print(f"  old endpoint: {r.status_code} | {r.text[:300]}")


async def test_jiomart(c: httpx.AsyncClient):
    print("\n=== JIOMART ===")
    r = await c.get(
        "https://www.jiomart.com/catalog/product/get_json_data",
        params={"q": "amul milk", "cat_id": "", "page_no": 1, "page_size": 5,
                "sort_by": "relevance", "channel": "web"},
        headers={
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.jiomart.com/search#query=amul+milk",
            "x-channel": "web",
            "Origin": "https://www.jiomart.com",
            "User-Agent": UA,
        },
    )
    print(f"Status: {r.status_code} | Content-Type: {r.headers.get('content-type', '?')}")
    raw = r.text
    print(f"First 600 chars:\n{raw[:600]}")

    # Try to find JSON inside HTML
    json_match = re.search(r"(\{.*\})", raw[:2000], re.DOTALL)
    if json_match:
        try:
            d = json.loads(json_match.group(1))
            print(f"Parsed JSON keys: {list(d.keys())[:8]}")
        except Exception:
            pass


async def test_blinkit_js(c: httpx.AsyncClient):
    print("\n=== BLINKIT - find new API from JS bundle ===")
    r = await c.get(
        "https://blinkit.com/s/?q=amul+milk",
        headers={"User-Agent": UA, "Accept": "text/html"},
    )
    html = r.text
    print(f"Search page: {r.status_code} | size: {len(html)}")

    # Find JS bundle URLs
    js_urls = re.findall(r'src="(https://[^"]+\.js)"', html)
    if not js_urls:
        js_urls = re.findall(r'"(https://[^"]+chunk[^"]+\.js)"', html)
    print(f"JS bundles: {len(js_urls)}")
    for u in js_urls[:5]:
        print(f"  {u}")

    # Find API paths in HTML
    api_hits = re.findall(r'"(/(?:v\d|api)[^"]{10,60})"', html)
    unique_apis = list(dict.fromkeys(api_hits))
    print(f"API paths in HTML: {unique_apis[:15]}")

    # Try to fetch first JS bundle and search for API paths
    if js_urls:
        try:
            rj = await c.get(js_urls[0], headers={"User-Agent": UA})
            js_text = rj.text
            # Find fetch/axios calls with paths
            fetch_paths = re.findall(r'["\`](/(?:v\d|api|search|listing|product)[^"\`]{5,80})["\`]', js_text)
            unique_fetch = list(dict.fromkeys(fetch_paths))
            print(f"\nAPI paths in JS bundle ({len(js_text)} bytes):")
            for p in unique_fetch[:20]:
                print(f"  {p}")
        except Exception as e:
            print(f"JS fetch error: {e}")


async def test_swiggy_instamart(c: httpx.AsyncClient):
    print("\n=== SWIGGY INSTAMART - find correct endpoint ===")
    # Get Swiggy homepage to find current API
    r = await c.get(
        "https://www.swiggy.com/instamart",
        headers={"User-Agent": UA, "Accept": "text/html"},
    )
    html = r.text
    print(f"Instamart page: {r.status_code} | size: {len(html)}")

    api_hits = re.findall(r'"(/(?:api|mapi|v\d)[^"]{10,80})"', html)
    unique = list(dict.fromkeys(api_hits))
    print(f"API paths: {unique[:15]}")

    # Try the 202 endpoint with proper body
    r2 = await c.get(
        "https://www.swiggy.com/api/instamart/search",
        params={"query": "amul milk", "pageNumber": 0, "pageSize": 10,
                "lat": "12.9716", "lng": "77.5946"},
        headers={
            "Accept": "application/json",
            "Origin": "https://www.swiggy.com",
            "Referer": "https://www.swiggy.com/instamart/search?query=amul+milk",
            "User-Agent": UA,
        },
    )
    print(f"202 endpoint with lat/lng: {r2.status_code} | {len(r2.content)} bytes | {r2.text[:200]}")


async def main():
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as c:
        await test_bigbasket(c)
        await test_jiomart(c)
        await test_blinkit_js(c)
        await test_swiggy_instamart(c)


if __name__ == "__main__":
    asyncio.run(main())
