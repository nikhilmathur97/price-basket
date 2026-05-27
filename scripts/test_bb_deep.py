#!/usr/bin/env python3
"""
Deep test BigBasket working endpoint + find Blinkit current API.
Run: backend/.venv_mac/bin/python3 scripts/test_bb_deep.py
"""
import asyncio
import json
import httpx
import re

UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
UA_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

async def test_bigbasket_deep(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BIGBASKET DEEP TEST")
    print("="*60)
    
    # Step 1: Get all cookies from homepage
    print("\n[Step 1] Getting full cookies from BigBasket homepage...")
    cookies = {}
    try:
        r = await client.get(
            "https://www.bigbasket.com/",
            headers={"User-Agent": UA_DESKTOP},
            timeout=20
        )
        cookies = dict(r.cookies)
        print(f"  Status: {r.status_code}")
        print(f"  All cookies: {json.dumps(cookies, indent=2)}")
    except Exception as e:
        print(f"  Error: {e}")
    
    nhid = cookies.get("_bb_nhid", cookies.get("nhid", "7427"))
    csrftoken = cookies.get("csrftoken", "")
    
    # Build cookie string
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.bigbasket.com/",
        "Origin": "https://www.bigbasket.com",
        "x-channel": "BB-WEB",
        "Cookie": cookie_str,
    }
    if csrftoken:
        headers["X-CSRFToken"] = csrftoken
    
    # Step 2: Test the working endpoint with more params
    print(f"\n[Step 2] Testing /product/get-products/ with full cookies (nhid={nhid})...")
    try:
        params = {"q": "milk", "nc": "as"}
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params=params,
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Top-level keys: {list(data.keys())}")
            # Explore structure
            if "tab_info" in data:
                tabs = data["tab_info"]
                print(f"  tab_info type: {type(tabs)}")
                if isinstance(tabs, list) and tabs:
                    print(f"  First tab keys: {list(tabs[0].keys()) if isinstance(tabs[0], dict) else tabs[0]}")
            if "products" in data:
                prods = data["products"]
                print(f"  products count: {len(prods) if isinstance(prods, list) else 'not list'}")
                if isinstance(prods, list) and prods:
                    print(f"  First product keys: {list(prods[0].keys())[:10]}")
        else:
            print(f"  Body: {r.text[:500]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 3: Try with search query param
    print("\n[Step 3] Testing /product/get-products/ with 'search' param...")
    try:
        params = {"q": "milk", "nc": "as", "type": "search"}
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params=params,
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())}")
            # Try to find products
            for key in data:
                val = data[key]
                if isinstance(val, list) and val and isinstance(val[0], dict):
                    print(f"  '{key}' is a list of {len(val)} dicts, first keys: {list(val[0].keys())[:8]}")
        else:
            print(f"  Body: {r.text[:500]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 4: Try listing-svc with all cookies
    print("\n[Step 4] Testing listing-svc/v2/products with full cookies...")
    try:
        params = {
            "type": "search",
            "slug": "milk",
        }
        r = await client.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params=params,
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:500]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 5: Try BB Now (quick commerce) specific endpoint
    print("\n[Step 5] Testing BB Now specific endpoint...")
    try:
        params = {"q": "milk", "nc": "as"}
        r = await client.get(
            "https://www.bigbasket.com/bbnow/product/get-products/",
            params=params,
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            data = r.json()
            print(f"  Keys: {list(data.keys())}")
            print("  ✅ WORKS!")
        else:
            print(f"  Content-Type: {ct}")
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_blinkit_deep(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BLINKIT DEEP TEST - Finding current API")
    print("="*60)
    
    # Step 1: Get Blinkit homepage to extract cookies and JS bundle URL
    print("\n[Step 1] Getting Blinkit homepage for cookies + JS bundle...")
    cookies = {}
    js_bundle_url = None
    try:
        r = await client.get(
            "https://blinkit.com/",
            headers={"User-Agent": UA_DESKTOP},
            timeout=20
        )
        cookies = dict(r.cookies)
        print(f"  Status: {r.status_code}")
        print(f"  Cookies: {list(cookies.keys())}")
        
        # Find JS bundle
        html = r.text
        # Look for main JS bundle
        matches = re.findall(r'src="(/scripts/[^"]+\.js)"', html)
        if not matches:
            matches = re.findall(r'"(/[^"]*main[^"]*\.js)"', html)
        if not matches:
            matches = re.findall(r'src="(https://[^"]+\.js)"', html)
        print(f"  JS bundles found: {matches[:5]}")
        if matches:
            js_bundle_url = matches[0]
            if not js_bundle_url.startswith("http"):
                js_bundle_url = "https://blinkit.com" + js_bundle_url
    except Exception as e:
        print(f"  Error: {e}")
    
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
    
    # Step 2: Try to fetch JS bundle and find API paths
    if js_bundle_url:
        print(f"\n[Step 2] Fetching JS bundle: {js_bundle_url}")
        try:
            r = await client.get(js_bundle_url, headers={"User-Agent": UA_DESKTOP}, timeout=30)
            print(f"  Status: {r.status_code}")
            if r.status_code == 200:
                js = r.text
                print(f"  Bundle size: {len(js)} chars")
                
                # Find all API paths
                api_paths = re.findall(r'["\`](/(?:v\d+|api)/[a-z/_-]+)["\`]', js)
                api_paths = list(set(api_paths))
                print(f"  API paths found ({len(api_paths)}):")
                for p in sorted(api_paths)[:30]:
                    print(f"    {p}")
                
                # Look specifically for search/listing
                search_paths = [p for p in api_paths if any(k in p for k in ["search", "listing", "product", "catalog", "query"])]
                print(f"\n  Search/listing paths: {search_paths}")
        except Exception as e:
            print(f"  Error: {e}")
    
    # Step 3: Try known Blinkit endpoints with cookies
    print("\n[Step 3] Testing Blinkit endpoints with cookies...")
    endpoints = [
        ("/v1/layout/listing_widgets", {"page_type": "listing", "q": "milk"}),
        ("/v2/listing/products", {"search": "milk", "page": "1"}),
        ("/v4/listing/products", {"search": "milk", "page": "1"}),
        ("/v5/listing/products", {"search": "milk", "page": "1"}),
        ("/v1/listing/products", {"search": "milk", "page": "1"}),
        ("/v1/search/products", {"q": "milk"}),
        ("/api/v1/search", {"q": "milk"}),
        ("/api/v2/search", {"q": "milk"}),
        ("/v1/products/search", {"q": "milk"}),
    ]
    
    for path, params in endpoints:
        try:
            r = await client.get(
                f"https://blinkit.com{path}",
                params=params,
                headers=headers,
                timeout=10
            )
            status = r.status_code
            ct = r.headers.get("content-type", "")
            if status == 200 and "json" in ct:
                data = r.json()
                print(f"  ✅ {path} → 200, keys: {list(data.keys())[:5]}")
            elif status == 200:
                print(f"  ⚠️  {path} → 200 but {ct}: {r.text[:100]}")
            else:
                print(f"  ❌ {path} → {status}")
        except Exception as e:
            print(f"  💥 {path} → {e}")
        await asyncio.sleep(0.5)


async def test_zepto_deep(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("ZEPTO DEEP TEST")
    print("="*60)
    
    # Step 1: Get Zepto homepage to find actual API
    print("\n[Step 1] Getting Zepto homepage...")
    try:
        r = await client.get(
            "https://www.zeptonow.com/",
            headers={"User-Agent": UA_MOBILE},
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        
        # Find Next.js data
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
        if match:
            try:
                next_data = json.loads(match.group(1))
                print(f"  NEXT_DATA keys: {list(next_data.keys())}")
                # Look for API config
                props = next_data.get("props", {})
                page_props = props.get("pageProps", {})
                print(f"  pageProps keys: {list(page_props.keys())[:10]}")
            except:
                pass
        
        # Find API URLs in HTML
        api_urls = re.findall(r'https://[a-z.-]*zepto[a-z.-]*/[a-z/v0-9-]+', html)
        api_urls = list(set(api_urls))
        print(f"  API URLs in HTML: {api_urls[:10]}")
        
        # Find JS bundles
        js_bundles = re.findall(r'src="(https://cdn\.zeptonow\.com[^"]+\.js)"', html)
        print(f"  JS bundles: {js_bundles[:3]}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 2: Try Zepto search page to get API calls
    print("\n[Step 2] Trying Zepto search page...")
    try:
        r = await client.get(
            "https://www.zeptonow.com/search",
            params={"query": "milk"},
            headers={"User-Agent": UA_MOBILE, "Accept": "text/html"},
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        
        # Find API calls in page
        api_calls = re.findall(r'"(https://[^"]*(?:search|product|catalog)[^"]*)"', html)
        api_calls = list(set(api_calls))[:10]
        print(f"  API calls found: {api_calls}")
        
    except Exception as e:
        print(f"  Error: {e}")
    
    # Step 3: Try Zepto with store/location headers
    print("\n[Step 3] Trying Zepto with store headers...")
    headers = {
        "User-Agent": UA_MOBILE,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-store-id": "1",
        "x-latitude": "26.9124",
        "x-longitude": "75.7873",
        "Referer": "https://www.zeptonow.com/",
        "Origin": "https://www.zeptonow.com",
    }
    
    endpoints = [
        ("POST", "https://www.zeptonow.com/api/v3/search/products", {"query": "milk", "pageNumber": 0, "pageSize": 20}),
        ("POST", "https://www.zeptonow.com/api/v4/search", {"query": "milk", "pageNumber": 0}),
        ("GET", "https://www.zeptonow.com/api/v3/products/search", {"q": "milk"}),
        ("POST", "https://www.zeptonow.com/api/v3/search", {"query": "milk", "pageNumber": 0, "pageSize": 20, "intent": False}),
    ]
    
    for method, url, payload in endpoints:
        try:
            if method == "POST":
                r = await client.post(url, json=payload, headers=headers, timeout=10)
            else:
                r = await client.get(url, params=payload, headers=headers, timeout=10)
            
            status = r.status_code
            ct = r.headers.get("content-type", "")
            if status == 200 and "json" in ct:
                data = r.json()
                print(f"  ✅ {method} {url.split('zeptonow.com')[1]} → 200, keys: {list(data.keys())[:5]}")
            else:
                print(f"  ❌ {method} {url.split('zeptonow.com')[1]} → {status}")
        except Exception as e:
            print(f"  💥 {url.split('zeptonow.com')[1]} → {type(e).__name__}: {str(e)[:50]}")
        await asyncio.sleep(0.5)


async def main():
    print("🔍 Deep API Testing...")
    
    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,
        timeout=30,
    ) as client:
        await test_bigbasket_deep(client)
        await asyncio.sleep(3)
        await test_blinkit_deep(client)
        await asyncio.sleep(3)
        await test_zepto_deep(client)
    
    print("\n✅ Deep tests complete!")

if __name__ == "__main__":
    asyncio.run(main())
