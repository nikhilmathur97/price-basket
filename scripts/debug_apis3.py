"""
Fetch Blinkit JS bundle to find real API endpoint + fix BigBasket type param.
Run: python scripts/debug_apis3.py
"""
import asyncio
import json
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


async def find_blinkit_api(c: httpx.AsyncClient):
    print("\n=== BLINKIT - parse JS bundle for API endpoint ===")
    # Fetch the main JS bundle
    bundle_url = "https://blinkit.com/scripts/main.acbd54663c1b03cd0fc5.js"
    print(f"Fetching: {bundle_url}")
    r = await c.get(bundle_url, headers={"User-Agent": UA, "Referer": "https://blinkit.com/"})
    print(f"Status: {r.status_code} | size: {len(r.content)}")

    if r.status_code != 200:
        # Try vendor bundle
        bundle_url = "https://blinkit.com/scripts/vendor.acbd54663c1b03cd0fc5.js"
        r = await c.get(bundle_url, headers={"User-Agent": UA, "Referer": "https://blinkit.com/"})
        print(f"Vendor bundle: {r.status_code} | size: {len(r.content)}")

    js = r.text

    # Find listing/search API paths
    listing_paths = re.findall(r'"(/(?:v\d+|api)[^"]{5,80})"', js)
    unique = list(dict.fromkeys(listing_paths))
    print(f"\nAll API paths in bundle ({len(unique)} unique):")
    for p in unique[:40]:
        print(f"  {p}")

    # Specifically look for listing
    listing = [p for p in unique if "listing" in p or "search" in p or "product" in p]
    print(f"\nListing/search paths:")
    for p in listing:
        print(f"  {p}")

    # Look for fetch/axios calls
    fetch_calls = re.findall(r'fetch\(["\`]([^"\`]{10,100})["\`]', js)
    print(f"\nFetch calls: {fetch_calls[:10]}")

    # Look for baseURL or API_URL
    base_urls = re.findall(r'(?:baseURL|API_URL|apiUrl|BASE_URL)[^"]*"([^"]{10,100})"', js)
    print(f"\nBase URLs: {base_urls[:5]}")

    return unique


async def fix_bigbasket(c: httpx.AsyncClient):
    print("\n=== BIGBASKET - fix 'type' param ===")
    # Get homepage for cookies first
    await c.get("https://www.bigbasket.com/",
        headers={"User-Agent": UA, "Accept": "text/html"})

    # BigBasket needs 'type' = 'listing' or 'search' or something else
    for type_val in ["listing", "search", "srch", "prd", "category", "brand", "1", "2"]:
        r = await c.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params={"slug": "amul milk", "page": 1, "tab": "prd",
                    "listingPageType": "srch", "type": type_val,
                    "lat": "28.6139", "lng": "77.2090"},
            headers={
                "x-channel": "BB-WEB",
                "Accept": "application/json",
                "Referer": "https://www.bigbasket.com/ps/?q=amul+milk",
                "Origin": "https://www.bigbasket.com",
                "User-Agent": UA,
            },
        )
        print(f"  type={type_val}: {r.status_code} | {r.text[:120]}")
        if r.status_code == 200:
            d = r.json()
            products = d.get("tab_info", [{}])[0].get("prod_list") or d.get("products") or []
            print(f"  ✅ Products: {len(products)}")
            if products:
                print(f"  First: {products[0].get('name', '?')}")
            return True

    # Try with nhid from cookies
    nhid = None
    for cookie in c.cookies.jar:
        if cookie.name == "_bb_nhid":
            nhid = cookie.value
            break
    print(f"\n  nhid from cookies: {nhid}")
    if nhid:
        r = await c.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params={"slug": "amul milk", "page": 1, "tab": "prd",
                    "listingPageType": "srch", "nhid": nhid},
            headers={
                "x-channel": "BB-WEB",
                "Accept": "application/json",
                "Referer": "https://www.bigbasket.com/ps/?q=amul+milk",
                "Origin": "https://www.bigbasket.com",
                "User-Agent": UA,
            },
        )
        print(f"  nhid param: {r.status_code} | {r.text[:300]}")
        if r.status_code == 200:
            d = r.json()
            products = d.get("tab_info", [{}])[0].get("prod_list") or d.get("products") or []
            print(f"  ✅ Products: {len(products)}")
            return True

    return False


async def test_bigbasket_search_page(c: httpx.AsyncClient):
    print("\n=== BIGBASKET - search page to find real API call ===")
    r = await c.get(
        "https://www.bigbasket.com/ps/?q=amul+milk",
        headers={"User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-IN,en;q=0.9"},
    )
    html = r.text
    print(f"Search page: {r.status_code} | size: {len(html)}")

    # Find API calls in the page
    api_paths = re.findall(r'"(/(?:listing-svc|api|product|catalog)[^"]{5,100})"', html)
    unique = list(dict.fromkeys(api_paths))
    print(f"API paths: {unique[:15]}")

    # Find __NEXT_DATA__ or window.__STATE__
    next_data = re.search(r'id="__NEXT_DATA__"[^>]*>(\{.*?\})</script>', html, re.DOTALL)
    if next_data:
        try:
            d = json.loads(next_data.group(1))
            print(f"NEXT_DATA keys: {list(d.keys())[:8]}")
        except Exception:
            pass

    # Find JS bundles
    js_bundles = re.findall(r'src="([^"]+\.js)"', html)
    print(f"JS bundles: {js_bundles[:5]}")


async def main():
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as c:
        await find_blinkit_api(c)
        await fix_bigbasket(c)
        await test_bigbasket_search_page(c)


if __name__ == "__main__":
    asyncio.run(main())
