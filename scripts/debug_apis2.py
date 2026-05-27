"""
Fix BigBasket with location cookies + find Blinkit new API endpoint.
Run: python scripts/debug_apis2.py
"""
import asyncio
import json
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


async def test_bigbasket_with_cookies(c: httpx.AsyncClient):
    print("\n=== BIGBASKET with location cookies ===")
    # Step 1: Get homepage to collect all cookies (location IDs)
    r0 = await c.get(
        "https://www.bigbasket.com/",
        headers={"User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-IN,en;q=0.9"},
    )
    print(f"Homepage: {r0.status_code}")
    cookies = dict(r0.cookies)
    print(f"Cookies: {list(cookies.keys())}")
    print(f"  _bb_loid={cookies.get('_bb_loid', 'MISSING')}")
    print(f"  _bb_nhid={cookies.get('_bb_nhid', 'MISSING')}")
    print(f"  _bb_bhid={cookies.get('_bb_bhid', 'MISSING')}")

    # Step 2: Try listing API with lat/lon in params
    for lat_lon in [
        {"lat": "28.6139", "lng": "77.2090"},   # Delhi
        {"lat": "12.9716", "lng": "77.5946"},   # Bangalore
        {"lat": "19.0760", "lng": "72.8777"},   # Mumbai
    ]:
        params = {
            "slug": "amul milk",
            "page": 1,
            "tab": "prd",
            "listingPageType": "srch",
            **lat_lon,
        }
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
        print(f"  lat={lat_lon['lat']}: {r.status_code} | {r.text[:200]}")
        if r.status_code == 200:
            d = r.json()
            products = d.get("tab_info", [{}])[0].get("prod_list") or d.get("products") or []
            print(f"  ✅ Products: {len(products)}")
            if products:
                p = products[0]
                pricing = p.get("pricing", {}).get("discount") or {}
                print(f"  Name: {p.get('name', '?')} | Price: {pricing.get('pricenow', '?')}")
            return True

    # Step 3: Try with Mid from cookies
    mid = cookies.get("_bb_loid") or cookies.get("_bb_nhid") or cookies.get("_bb_bhid")
    if mid:
        print(f"\n  Trying with Mid={mid}")
        r = await c.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params={"slug": "amul milk", "page": 1, "tab": "prd",
                    "listingPageType": "srch", "Mid": mid},
            headers={
                "x-channel": "BB-WEB",
                "Accept": "application/json",
                "Referer": "https://www.bigbasket.com/ps/?q=amul+milk",
                "Origin": "https://www.bigbasket.com",
                "User-Agent": UA,
            },
        )
        print(f"  Mid param: {r.status_code} | {r.text[:300]}")

    return False


async def test_blinkit_new_api(c: httpx.AsyncClient):
    print("\n=== BLINKIT - find new API ===")
    # Get the main search page and find the actual JS app bundle
    r = await c.get(
        "https://blinkit.com/s/?q=amul+milk",
        headers={"User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-IN,en;q=0.9"},
    )
    html = r.text
    print(f"Search page: {r.status_code} | size: {len(html)}")

    # Find all script src URLs
    all_scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
    print(f"All script tags: {len(all_scripts)}")
    for s in all_scripts:
        print(f"  {s}")

    # Find inline script content for API hints
    inline_scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
    for i, sc in enumerate(inline_scripts):
        if any(kw in sc for kw in ["api", "listing", "search", "fetch", "axios"]):
            print(f"\nInline script {i} (relevant):")
            print(sc[:500])

    # Try Blinkit's new known endpoints (from community research)
    new_endpoints = [
        "https://blinkit.com/v1/listing/products",
        "https://blinkit.com/v3/listing/products",
        "https://blinkit.com/v4/listing/products",
        "https://blinkit.com/v5/listing/products",
        "https://blinkit.com/v7/listing/products",
        "https://blinkit.com/v8/listing/products",
        "https://blinkit.com/api/v1/search",
        "https://blinkit.com/api/search",
        "https://blinkit.com/search/v1/products",
        "https://blinkit.com/search/v2/products",
    ]
    print("\nTrying new endpoints:")
    for ep in new_endpoints:
        try:
            r2 = await c.get(
                ep,
                params={"q": "amul milk", "start": 0, "limit": 5, "search_type": 8},
                headers={
                    "app_client": "consumer_web",
                    "lat": "28.6139",
                    "lon": "77.2090",
                    "Accept": "application/json",
                    "Origin": "https://blinkit.com",
                    "Referer": "https://blinkit.com/s/?q=amul+milk",
                    "User-Agent": UA,
                    "web-version": "2024120401",
                    "rn_bundle_version": "1000033",
                },
            )
            size = len(r2.content)
            print(f"  {ep.split('blinkit.com')[1]}: {r2.status_code} | {size} bytes")
            if r2.status_code == 200 and size > 100:
                try:
                    d = r2.json()
                    print(f"    ✅ JSON keys: {list(d.keys())[:8]}")
                    return ep
                except Exception:
                    print(f"    Not JSON: {r2.text[:100]}")
        except Exception as e:
            print(f"  {ep}: {e}")
    return None


async def test_zepto_alternatives(c: httpx.AsyncClient):
    print("\n=== ZEPTO - alternative approaches ===")
    # Zepto's api subdomain doesn't resolve - try their CDN/app endpoints
    endpoints = [
        ("POST", "https://www.zeptonow.com/api/v3/search"),
        ("POST", "https://www.zeptonow.com/api/v2/search"),
        ("GET", "https://www.zeptonow.com/api/v3/products/search"),
        ("POST", "https://node-api.zeptonow.com/api/v3/search"),
    ]
    for method, url in endpoints:
        try:
            if method == "POST":
                r = await c.post(
                    url,
                    json={"query": "amul milk", "pageNumber": 0, "pageSize": 5,
                          "mode": "PRODUCT_SEARCH", "currPage": 0},
                    headers={
                        "Content-Type": "application/json",
                        "x-app-version": "11.20.3",
                        "x-platform": "WEB",
                        "store_id": "1",
                        "Accept": "application/json",
                        "Origin": "https://www.zeptonow.com",
                        "Referer": "https://www.zeptonow.com/",
                        "User-Agent": UA,
                    },
                )
            else:
                r = await c.get(
                    url,
                    params={"q": "amul milk", "page": 0, "size": 5},
                    headers={"Accept": "application/json", "User-Agent": UA,
                             "Origin": "https://www.zeptonow.com"},
                )
            print(f"  {method} {url.split('zeptonow.com')[1]}: {r.status_code} | {len(r.content)} bytes")
            if r.status_code == 200:
                try:
                    d = r.json()
                    print(f"    ✅ Keys: {list(d.keys())[:6]}")
                except Exception:
                    print(f"    Response: {r.text[:150]}")
        except Exception as e:
            print(f"  {url}: {e}")


async def main():
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as c:
        await test_bigbasket_with_cookies(c)
        await test_blinkit_new_api(c)
        await test_zepto_alternatives(c)


if __name__ == "__main__":
    asyncio.run(main())
