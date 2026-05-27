#!/usr/bin/env python3
"""
Fix BigBasket location setup + Blinkit listing_widgets correct params + Zepto CDN JS
Run: backend/.venv_mac/bin/python3 scripts/test_fix.py
"""
import asyncio
import json
import httpx
import re

UA_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

async def fix_bigbasket(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BIGBASKET - Fix location setup")
    print("="*60)
    
    # Step 1: Get homepage cookies
    print("\n[1] Getting homepage cookies...")
    r = await client.get("https://www.bigbasket.com/", headers={"User-Agent": UA_DESKTOP}, timeout=20)
    cookies = dict(r.cookies)
    print(f"  Got cookies: {list(cookies.keys())}")
    
    # Step 2: Set location via pincode
    print("\n[2] Setting location via pincode 302020 (Jaipur)...")
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Referer": "https://www.bigbasket.com/",
        "Cookie": cookie_str,
        "X-CSRFToken": cookies.get("csrftoken", ""),
    }
    
    # Try setting pincode
    try:
        r = await client.post(
            "https://www.bigbasket.com/member/set-delivery-location/",
            json={"pincode": "302020"},
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if "json" in ct:
            print(f"  Response: {r.json()}")
        else:
            print(f"  Body: {r.text[:200]}")
        # Update cookies
        cookies.update(dict(r.cookies))
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 3: Try location API
    print("\n[3] Trying location API with lat/lon...")
    try:
        r = await client.post(
            "https://www.bigbasket.com/member/set-delivery-location-v2/",
            json={"lat": 26.9124, "lng": 75.7873},
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if "json" in ct:
            print(f"  Response: {r.json()}")
        else:
            print(f"  Body: {r.text[:200]}")
        cookies.update(dict(r.cookies))
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 4: Try with Mumbai pincode (400001) - major city
    print("\n[4] Trying Mumbai pincode 400001...")
    try:
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params={"q": "milk", "nc": "as", "pincode": "400001"},
            headers={**headers, "Cookie": "; ".join(f"{k}={v}" for k, v in cookies.items())},
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            tab_info = data.get("tab_info", [])
            print(f"  tab_info length: {len(tab_info)}")
            if tab_info:
                print(f"  ✅ Got products!")
                print(f"  First tab keys: {list(tab_info[0].keys()) if isinstance(tab_info[0], dict) else tab_info[0]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 5: Try BB Now specific search with nhid
    print("\n[5] Trying BB Now search with nhid in cookie...")
    # Set nhid explicitly
    cookies["_bb_nhid"] = "7427"
    cookies["_bb_dsid"] = "7427"
    cookies["xentrycontext"] = "bbnow"
    cookies["xentrycontextid"] = "10"
    
    cookie_str2 = "; ".join(f"{k}={v}" for k, v in cookies.items())
    
    try:
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params={"q": "milk", "nc": "as"},
            headers={
                **headers,
                "Cookie": cookie_str2,
                "x-channel": "BB-WEB",
                "xentrycontext": "bbnow",
            },
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            tab_info = data.get("tab_info", [])
            print(f"  tab_info length: {len(tab_info)}")
            if tab_info:
                print(f"  ✅ Got products!")
                t = tab_info[0]
                if isinstance(t, dict):
                    for k, v in t.items():
                        if isinstance(v, list):
                            print(f"    '{k}': {len(v)} items")
            else:
                print(f"  Still empty. Full response: {json.dumps(data)[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 6: Try the search page directly (HTML scraping)
    print("\n[6] Trying BigBasket search page HTML scraping...")
    try:
        r = await client.get(
            "https://www.bigbasket.com/ps/",
            params={"q": "milk"},
            headers={
                "User-Agent": UA_DESKTOP,
                "Accept": "text/html",
                "Cookie": cookie_str2,
            },
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        
        # Look for __NEXT_DATA__
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
        if match:
            try:
                next_data = json.loads(match.group(1))
                print(f"  NEXT_DATA keys: {list(next_data.keys())}")
                props = next_data.get("props", {})
                page_props = props.get("pageProps", {})
                print(f"  pageProps keys: {list(page_props.keys())[:15]}")
                
                # Look for products
                def find_products(obj, depth=0):
                    if depth > 5:
                        return
                    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
                        if any(k in obj[0] for k in ["sp", "mrp", "price", "selling_price"]):
                            print(f"  ✅ Found products list at depth {depth}! Count: {len(obj)}")
                            print(f"     First product keys: {list(obj[0].keys())[:10]}")
                            print(f"     Sample: {json.dumps(obj[0])[:300]}")
                            return
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            find_products(v, depth+1)
                    elif isinstance(obj, list):
                        for item in obj[:3]:
                            find_products(item, depth+1)
                
                find_products(page_props)
            except json.JSONDecodeError as e:
                print(f"  JSON error: {e}")
        else:
            print(f"  No NEXT_DATA found")
            # Look for product data in HTML
            prices = re.findall(r'"sp"\s*:\s*(\d+\.?\d*)', html)
            if prices:
                print(f"  Found {len(prices)} prices in HTML: {prices[:5]}")
    except Exception as e:
        print(f"  Error: {e}")


async def fix_blinkit(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BLINKIT - Test listing_widgets with correct params")
    print("="*60)
    
    # Get cookies first
    print("\n[1] Getting Blinkit cookies...")
    r = await client.get("https://blinkit.com/", headers={"User-Agent": UA_DESKTOP}, timeout=20)
    cookies = dict(r.cookies)
    print(f"  Cookies: {list(cookies.keys())}")
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://blinkit.com/",
        "Origin": "https://blinkit.com",
        "app_client": "consumer_web",
        "app_version": "1000",
        "web_app_version": "1001",
        "lat": "26.9124",
        "lon": "75.7873",
        "Cookie": cookie_str,
    }
    
    # Test listing_widgets with various param combinations
    print("\n[2] Testing /v1/layout/listing_widgets with various params...")
    
    param_sets = [
        {"page_type": "listing", "q": "milk"},
        {"page_type": "listing", "q": "milk", "lat": "26.9124", "lon": "75.7873"},
        {"page_type": "search", "q": "milk"},
        {"page_type": "listing", "search": "milk"},
        {"q": "milk", "lat": "26.9124", "lon": "75.7873"},
        {"page_type": "listing", "q": "milk", "page": "1"},
        {"page_type": "listing", "q": "milk", "start": "0", "limit": "20"},
    ]
    
    for params in param_sets:
        try:
            r = await client.get(
                "https://blinkit.com/v1/layout/listing_widgets",
                params=params,
                headers=headers,
                timeout=10
            )
            status = r.status_code
            ct = r.headers.get("content-type", "")
            param_str = "&".join(f"{k}={v}" for k, v in params.items())
            if status == 200 and "json" in ct:
                data = r.json()
                print(f"  ✅ {param_str} → 200, keys: {list(data.keys())[:5]}")
            elif status == 200:
                print(f"  ⚠️  {param_str} → 200 ({ct}): {r.text[:100]}")
            else:
                print(f"  ❌ {param_str} → {status}")
        except Exception as e:
            print(f"  💥 {e}")
        await asyncio.sleep(0.5)
    
    # Try the category URL format from JS: /cn/+l+/cid/+s+/+c
    print("\n[3] Testing Blinkit category URL format...")
    try:
        r = await client.get(
            "https://blinkit.com/cn/dairy-bread-eggs/cid/14/",
            headers={**headers, "Accept": "text/html,application/xhtml+xml"},
            timeout=15
        )
        print(f"  Category page status: {r.status_code}")
        html = r.text
        
        # Look for __NEXT_DATA__
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
        if match:
            try:
                next_data = json.loads(match.group(1))
                print(f"  NEXT_DATA keys: {list(next_data.keys())}")
                props = next_data.get("props", {})
                page_props = props.get("pageProps", {})
                print(f"  pageProps keys: {list(page_props.keys())[:10]}")
            except:
                pass
        
        # Look for product data
        products_match = re.findall(r'"name":"([^"]+)","price":(\d+)', html)
        if products_match:
            print(f"  Found {len(products_match)} products in HTML!")
            for name, price in products_match[:3]:
                print(f"    {name}: ₹{price}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Try Blinkit search page
    print("\n[4] Testing Blinkit search page HTML...")
    try:
        r = await client.get(
            "https://blinkit.com/s/",
            params={"q": "milk"},
            headers={**headers, "Accept": "text/html"},
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        
        # Look for product data
        prices = re.findall(r'"selling_price"\s*:\s*(\d+)', html)
        if prices:
            print(f"  Found {len(prices)} prices: {prices[:5]}")
        
        names = re.findall(r'"product_name"\s*:\s*"([^"]+)"', html)
        if names:
            print(f"  Found {len(names)} product names: {names[:3]}")
        
        # Look for __NEXT_DATA__
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
        if match:
            try:
                next_data = json.loads(match.group(1))
                print(f"  NEXT_DATA keys: {list(next_data.keys())}")
            except:
                pass
    except Exception as e:
        print(f"  Error: {e}")


async def fix_zepto_js(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("ZEPTO - Find actual API from JS bundles")
    print("="*60)
    
    # The 572-byte bundle was likely a redirect or wrapper
    # Let's get the actual search page JS
    print("\n[1] Getting Zepto search page to find JS bundles...")
    try:
        r = await client.get(
            "https://www.zeptonow.com/search",
            params={"query": "milk"},
            headers={"User-Agent": UA_MOBILE, "Accept": "text/html"},
            timeout=20
        )
        html = r.text
        
        # Find all JS bundles
        js_bundles = re.findall(r'"(https://cdn\.zeptonow\.com[^"]+\.js)"', html)
        js_bundles = list(set(js_bundles))
        print(f"  Found {len(js_bundles)} JS bundles")
        
        # Find the search-related bundle
        search_bundles = [b for b in js_bundles if "search" in b.lower()]
        print(f"  Search bundles: {search_bundles}")
        
        # Fetch the search bundle
        if search_bundles:
            bundle_url = search_bundles[0]
            print(f"\n[2] Fetching search bundle: {bundle_url}")
            r2 = await client.get(bundle_url, headers={"User-Agent": UA_DESKTOP}, timeout=30)
            print(f"  Status: {r2.status_code}")
            if r2.status_code == 200:
                js = r2.text
                print(f"  Bundle size: {len(js):,} chars")
                
                # Find API paths
                api_paths = set()
                for pat in [
                    r'["\`](/api/v\d+/[^"` ]{5,80})["\`]',
                    r'"(https://[^"]*(?:zepto|zeptonow)[^"]{5,80})"',
                    r'baseURL:\s*["\`]([^"` ]+)["\`]',
                    r'apiUrl:\s*["\`]([^"` ]+)["\`]',
                ]:
                    found = re.findall(pat, js)
                    api_paths.update(found)
                
                print(f"  API paths found: {sorted(api_paths)[:20]}")
                
                # Search for fetch/axios calls
                fetch_calls = re.findall(r'fetch\(["\`]([^"` ]+)["\`]', js)
                print(f"  fetch() calls: {fetch_calls[:10]}")
                
                axios_calls = re.findall(r'axios\.[a-z]+\(["\`]([^"` ]+)["\`]', js)
                print(f"  axios calls: {axios_calls[:10]}")
        
        # Also try the app bundle
        app_bundles = [b for b in js_bundles if "app" in b.lower() or "page" in b.lower()]
        print(f"\n  App/page bundles: {app_bundles[:5]}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # Try Zepto with proper store setup
    print("\n[3] Testing Zepto with proper store/location setup...")
    
    # First get cookies
    try:
        r = await client.get(
            "https://www.zeptonow.com/",
            headers={"User-Agent": UA_MOBILE},
            timeout=20
        )
        cookies = dict(r.cookies)
        print(f"  Cookies: {list(cookies.keys())}")
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        
        # Try with cookies
        headers = {
            "User-Agent": UA_MOBILE,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Cookie": cookie_str,
            "Origin": "https://www.zeptonow.com",
            "Referer": "https://www.zeptonow.com/search?query=milk",
        }
        
        r2 = await client.post(
            "https://www.zeptonow.com/api/v3/search",
            json={"query": "milk", "pageNumber": 0, "pageSize": 20, "intent": False, "isRecommendation": False},
            headers=headers,
            timeout=15
        )
        print(f"  POST /api/v3/search with cookies → {r2.status_code}")
        ct = r2.headers.get("content-type", "")
        if "json" in ct:
            data = r2.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print(f"  ✅ WORKS!")
        else:
            print(f"  Body: {r2.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")


async def main():
    print("🔧 Fixing API issues...")
    
    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,
        timeout=30,
    ) as client:
        await fix_bigbasket(client)
        await asyncio.sleep(2)
        await fix_blinkit(client)
        await asyncio.sleep(2)
        await fix_zepto_js(client)
    
    print("\n✅ Fix tests complete!")

if __name__ == "__main__":
    asyncio.run(main())
