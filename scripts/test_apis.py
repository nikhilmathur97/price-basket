"""
Test all quick-commerce platform APIs to find what works from current IP.
Run: python scripts/test_apis.py
"""
import asyncio
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
LAT = "28.6139"
LON = "77.2090"


async def test_blinkit(c: httpx.AsyncClient):
    print("\n=== BLINKIT ===")
    # Step 1: get homepage for cookies + find current API path
    r = await c.get("https://blinkit.com/s/?q=amul+milk",
        headers={"User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-IN,en;q=0.9"})
    print(f"Search page: {r.status_code} | size: {len(r.content)}")

    # Extract API paths from HTML
    html = r.text
    api_paths = re.findall(r'"(/(?:api|v\d+|search|listing|product)[^"]{5,80})"', html)
    unique = list(dict.fromkeys(api_paths))[:15]
    if unique:
        print("API paths in page:")
        for p in unique:
            print(f"  {p}")

    # Try known endpoints with cookies from homepage
    for ep in [
        "https://blinkit.com/v6/listing/products",
        "https://blinkit.com/v2/listing/products",
        "https://blinkit.com/api/v1/listing/products",
        "https://blinkit.com/api/v2/listing/products",
        "https://blinkit.com/api/v6/listing/products",
    ]:
        try:
            r2 = await c.get(ep,
                params={"q": "amul milk", "start": 0, "limit": 5, "search_type": 8},
                headers={
                    "app_client": "consumer_web",
                    "lat": LAT, "lon": LON,
                    "Accept": "application/json",
                    "Origin": "https://blinkit.com",
                    "Referer": "https://blinkit.com/s/?q=amul+milk",
                    "User-Agent": UA,
                    "web-version": "2024120401",
                    "rn_bundle_version": "1000033",
                })
            print(f"  {ep.split('blinkit.com')[1]}: {r2.status_code} | {len(r2.content)} bytes")
            if r2.status_code == 200:
                try:
                    d = r2.json()
                    print(f"    JSON keys: {list(d.keys())[:8]}")
                    return True
                except Exception:
                    print(f"    Not JSON: {r2.text[:100]}")
        except Exception as e:
            print(f"  {ep}: {e}")
    return False


async def test_zepto(c: httpx.AsyncClient):
    print("\n=== ZEPTO ===")
    # Try multiple Zepto endpoints
    for url in [
        "https://api.zeptonow.com/api/v3/search",
        "https://api.zeptonow.com/api/v2/search",
        "https://www.zeptonow.com/api/v3/search",
    ]:
        try:
            r = await c.post(url,
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
                })
            print(f"  {url}: {r.status_code} | {len(r.content)} bytes")
            if r.status_code == 200:
                d = r.json()
                items = d.get("items") or d.get("data", {}).get("items") or d.get("results") or []
                print(f"    Items: {len(items)}")
                if items:
                    p = items[0].get("productResponse") or items[0]
                    print(f"    Product: {p.get('name', '?')} | mrp: {p.get('mrp', '?')}")
                    return True
        except Exception as e:
            print(f"  {url}: {e}")
    return False


async def test_bigbasket(c: httpx.AsyncClient):
    print("\n=== BIGBASKET ===")
    # BigBasket needs a session cookie with location
    # First try to get location cookie
    try:
        r0 = await c.get("https://www.bigbasket.com/",
            headers={"User-Agent": UA, "Accept": "text/html"})
        print(f"  Homepage: {r0.status_code} | cookies: {list(r0.cookies.keys())}")
    except Exception as e:
        print(f"  Homepage failed: {e}")

    for ep, params in [
        ("https://www.bigbasket.com/listing-svc/v2/products",
         {"slug": "amul milk", "page": 1, "tab": "prd", "listingPageType": "srch"}),
        ("https://www.bigbasket.com/product/get-products/",
         {"slug": "amul milk", "page": 1}),
    ]:
        try:
            r = await c.get(ep, params=params,
                headers={
                    "x-channel": "BB-WEB",
                    "Accept": "application/json",
                    "Referer": "https://www.bigbasket.com/ps/?q=amul+milk",
                    "Origin": "https://www.bigbasket.com",
                    "User-Agent": UA,
                })
            print(f"  {ep.split('bigbasket.com')[1]}: {r.status_code} | {len(r.content)} bytes")
            if r.status_code == 200:
                d = r.json()
                products = (d.get("tab_info", [{}])[0].get("prod_list")
                            or d.get("products") or [])
                print(f"    Products: {len(products)}")
                if products:
                    p = products[0]
                    print(f"    Name: {p.get('name', '?')}")
                    return True
            else:
                print(f"    Response: {r.text[:150]}")
        except Exception as e:
            print(f"  {ep}: {e}")
    return False


async def test_instamart(c: httpx.AsyncClient):
    print("\n=== SWIGGY INSTAMART ===")
    endpoints = [
        ("GET", "https://www.swiggy.com/mapi/instamart/search",
         {"pageNumber": 0, "searchResultsOffset": 0, "query": "amul milk",
          "layoutType": "GROCERY_SEARCH", "isPreSearchTag": "false",
          "highConfidencePageNo": 0, "lowConfidencePageNo": 0}),
        ("GET", "https://www.swiggy.com/api/instamart/search",
         {"query": "amul milk", "pageNumber": 0}),
        ("GET", "https://www.swiggy.com/instamart/api/search",
         {"query": "amul milk"}),
    ]
    for method, url, params in endpoints:
        try:
            r = await c.get(url, params=params,
                headers={
                    "Accept": "application/json",
                    "Origin": "https://www.swiggy.com",
                    "Referer": "https://www.swiggy.com/instamart/search?query=amul+milk",
                    "User-Agent": UA,
                })
            print(f"  {url.split('swiggy.com')[1]}: {r.status_code} | {len(r.content)} bytes")
            if r.status_code == 200:
                try:
                    d = r.json()
                    print(f"    Keys: {list(d.keys())[:6]}")
                    return True
                except Exception:
                    pass
        except Exception as e:
            print(f"  {url}: {e}")
    return False


async def test_jiomart(c: httpx.AsyncClient):
    print("\n=== JIOMART ===")
    for ep, params in [
        ("https://www.jiomart.com/catalog/product/get_json_data",
         {"q": "amul milk", "cat_id": "", "page_no": 1, "page_size": 5,
          "sort_by": "relevance", "channel": "web"}),
        ("https://www.jiomart.com/api/catalog/search",
         {"q": "amul milk", "page": 1}),
    ]:
        try:
            r = await c.get(ep, params=params,
                headers={
                    "Accept": "application/json",
                    "Referer": "https://www.jiomart.com/search#query=amul+milk",
                    "x-channel": "web",
                    "Origin": "https://www.jiomart.com",
                    "User-Agent": UA,
                })
            print(f"  {ep.split('jiomart.com')[1]}: {r.status_code} | {len(r.content)} bytes")
            if r.status_code == 200:
                try:
                    d = r.json()
                    products = d.get("data", {}).get("products") or d.get("products") or []
                    print(f"    Products: {len(products)}")
                    if products:
                        print(f"    Name: {products[0].get('name', '?')}")
                        return True
                except Exception:
                    print(f"    Not JSON / parse error")
        except Exception as e:
            print(f"  {ep}: {e}")
    return False


async def test_amazon(c: httpx.AsyncClient):
    print("\n=== AMAZON FRESH ===")
    try:
        r = await c.get("https://www.amazon.in/s",
            params={"k": "amul milk", "i": "nowstore"},
            headers={
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                "Accept-Language": "en-IN,en;q=0.9",
                "User-Agent": UA,
            })
        print(f"  Status: {r.status_code} | size: {len(r.content)}")
        if r.status_code == 200:
            html = r.text
            prices = re.findall(r'"priceAmount"\s*:\s*"([\d.]+)"', html)
            asins = re.findall(r'"asin"\s*:\s*"([A-Z0-9]{10})"', html)
            print(f"  Prices found: {prices[:5]}")
            print(f"  ASINs found: {asins[:3]}")
            if prices:
                return True
    except Exception as e:
        print(f"  Error: {e}")
    return False


async def main():
    print("=" * 60)
    print("PriceBasket — API Connectivity Test")
    print("=" * 60)

    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as c:
        # Show our IP
        try:
            r = await c.get("https://api.ipify.org?format=json")
            print(f"Your IP: {r.json().get('ip')}")
        except Exception:
            pass

        results = {}
        results["blinkit"] = await test_blinkit(c)
        results["zepto"] = await test_zepto(c)
        results["bigbasket"] = await test_bigbasket(c)
        results["instamart"] = await test_instamart(c)
        results["jiomart"] = await test_jiomart(c)
        results["amazon"] = await test_amazon(c)

    print("\n" + "=" * 60)
    print("SUMMARY:")
    for platform, ok in results.items():
        status = "✅ WORKING" if ok else "❌ BLOCKED/FAILED"
        print(f"  {platform:15} {status}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
