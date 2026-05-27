#!/usr/bin/env python3
"""
Explore BigBasket tab_info structure + Blinkit main.js + Zepto zepto.com
Run: backend/.venv_mac/bin/python3 scripts/test_explore.py
"""
import asyncio
import json
import httpx
import re

UA_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

BB_COOKIES = {
    "_bb_nhid": "7427",
    "_bb_dsid": "7427",
    "_bb_dsevid": "7427",
    "_bb_sa_ids": "19224",
    "_bb_cid": "1",
    "bb2_enabled": "true",
    "xentrycontext": "bbnow",
    "xentrycontextid": "10",
    "jentrycontextid": "10",
    "is_global": "1",
    "is_integrated_sa": "1",
    "x-channel": "web",
}

async def explore_bigbasket(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BIGBASKET - Explore tab_info structure")
    print("="*60)
    
    # First get fresh cookies
    print("\n[0] Getting fresh cookies...")
    try:
        r = await client.get("https://www.bigbasket.com/", headers={"User-Agent": UA_DESKTOP}, timeout=20)
        fresh_cookies = dict(r.cookies)
        BB_COOKIES.update(fresh_cookies)
        print(f"  Got {len(fresh_cookies)} cookies")
    except Exception as e:
        print(f"  Error: {e}")
    
    cookie_str = "; ".join(f"{k}={v}" for k, v in BB_COOKIES.items())
    
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.bigbasket.com/",
        "x-channel": "BB-WEB",
        "Cookie": cookie_str,
    }
    
    # Test the working endpoint and print full response
    print("\n[1] Full response from /product/get-products/...")
    try:
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params={"q": "milk", "nc": "as"},
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Top keys: {list(data.keys())}")
            
            # Explore tab_info
            tab_info = data.get("tab_info", [])
            print(f"\n  tab_info length: {len(tab_info)}")
            if tab_info:
                for i, tab in enumerate(tab_info[:3]):
                    print(f"\n  tab_info[{i}] keys: {list(tab.keys()) if isinstance(tab, dict) else type(tab)}")
                    if isinstance(tab, dict):
                        for k, v in tab.items():
                            if isinstance(v, list):
                                print(f"    '{k}': list of {len(v)}")
                                if v and isinstance(v[0], dict):
                                    print(f"      first item keys: {list(v[0].keys())[:10]}")
                                    # Print first product
                                    print(f"      first item: {json.dumps(v[0], indent=6)[:500]}")
                            elif isinstance(v, dict):
                                print(f"    '{k}': dict with keys {list(v.keys())[:8]}")
                            else:
                                print(f"    '{k}': {str(v)[:100]}")
            
            # Save full response for analysis
            with open("/tmp/bb_response.json", "w") as f:
                json.dump(data, f, indent=2)
            print("\n  Full response saved to /tmp/bb_response.json")
        else:
            print(f"  Body: {r.text[:500]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test with different queries
    print("\n[2] Testing with 'bread' query...")
    try:
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params={"q": "bread", "nc": "as"},
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            tab_info = data.get("tab_info", [])
            if tab_info and isinstance(tab_info[0], dict):
                # Find products in first tab
                for k, v in tab_info[0].items():
                    if isinstance(v, list) and v:
                        print(f"  '{k}' has {len(v)} items")
                        if isinstance(v[0], dict) and "sp" in v[0]:
                            print(f"  ✅ Found products in '{k}'!")
                            prod = v[0]
                            print(f"  Sample product: name={prod.get('desc','?')}, price={prod.get('sp','?')}, mrp={prod.get('mrp','?')}")
    except Exception as e:
        print(f"  Error: {e}")


async def explore_blinkit_main_js(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BLINKIT - Fetch main.js for API paths")
    print("="*60)
    
    # Fetch the main JS bundle (not reactvendor)
    js_url = "https://blinkit.com/scripts/main.acbd54663c1b03cd0fc5.js"
    print(f"\n[1] Fetching {js_url}...")
    try:
        r = await client.get(
            js_url,
            headers={"User-Agent": UA_DESKTOP, "Referer": "https://blinkit.com/"},
            timeout=60
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            js = r.text
            print(f"  Bundle size: {len(js):,} chars")
            
            # Find all API paths - more comprehensive patterns
            patterns = [
                r'["\`](/v\d+/[a-zA-Z/_-]+)["\`]',
                r'["\`](/api/[a-zA-Z/v0-9_-]+)["\`]',
                r'path:\s*["\`](/[a-zA-Z/v0-9_-]+)["\`]',
                r'url:\s*["\`](/[a-zA-Z/v0-9_-]+)["\`]',
                r'endpoint:\s*["\`](/[a-zA-Z/v0-9_-]+)["\`]',
                r'"(/v\d+/[^"]{5,50})"',
            ]
            
            all_paths = set()
            for pat in patterns:
                found = re.findall(pat, js)
                all_paths.update(found)
            
            print(f"\n  All API paths ({len(all_paths)}):")
            for p in sorted(all_paths):
                print(f"    {p}")
            
            # Search for specific keywords
            keywords = ["search", "listing", "product", "catalog", "query", "widget"]
            print(f"\n  Paths containing search keywords:")
            for p in sorted(all_paths):
                if any(k in p.lower() for k in keywords):
                    print(f"    ✅ {p}")
            
            # Also search raw text for API patterns
            print("\n  Raw text search for 'listing':")
            for m in re.finditer(r'.{0,50}listing.{0,50}', js):
                snippet = m.group(0)
                if "/" in snippet:
                    print(f"    {snippet}")
            
            print("\n  Raw text search for 'search':")
            count = 0
            for m in re.finditer(r'["\`](/[^"` ]{3,60}search[^"` ]{0,40})["\`]', js):
                print(f"    {m.group(1)}")
                count += 1
                if count > 20:
                    break
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Also try main- variant
    js_url2 = "https://blinkit.com/scripts/main-.acbd54663c1b03cd0fc5.js"
    print(f"\n[2] Fetching {js_url2}...")
    try:
        r = await client.get(
            js_url2,
            headers={"User-Agent": UA_DESKTOP, "Referer": "https://blinkit.com/"},
            timeout=60
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            js = r.text
            print(f"  Bundle size: {len(js):,} chars")
            
            all_paths = set()
            for pat in [r'"(/v\d+/[^"]{5,50})"', r'["\`](/api/[a-zA-Z/v0-9_-]+)["\`]']:
                found = re.findall(pat, js)
                all_paths.update(found)
            
            print(f"  API paths: {sorted(all_paths)[:20]}")
        else:
            print(f"  Status: {r.status_code}")
    except Exception as e:
        print(f"  Error: {e}")


async def explore_zepto(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("ZEPTO - Test zepto.com domain")
    print("="*60)
    
    headers = {
        "User-Agent": UA_MOBILE,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://www.zepto.com",
        "Referer": "https://www.zepto.com/",
    }
    
    # Test zepto.com (not zeptonow.com)
    print("\n[1] Testing www.zepto.com search endpoints...")
    endpoints = [
        ("POST", "https://www.zepto.com/api/v3/search", {"query": "milk", "pageNumber": 0, "pageSize": 20}),
        ("POST", "https://www.zepto.com/api/v2/search", {"query": "milk", "pageNumber": 0}),
        ("GET", "https://www.zepto.com/api/v1/search", {"q": "milk"}),
        ("POST", "https://www.zepto.com/api/v3/search/products", {"query": "milk"}),
        ("GET", "https://www.zepto.com/api/v3/products", {"q": "milk"}),
    ]
    
    for method, url, payload in endpoints:
        try:
            if method == "POST":
                r = await client.post(url, json=payload, headers=headers, timeout=10)
            else:
                r = await client.get(url, params=payload, headers=headers, timeout=10)
            
            status = r.status_code
            ct = r.headers.get("content-type", "")
            path = url.split("zepto.com")[1]
            if status == 200 and "json" in ct:
                data = r.json()
                print(f"  ✅ {method} {path} → 200, keys: {list(data.keys())[:5]}")
            elif status not in [404, 405]:
                print(f"  ⚠️  {method} {path} → {status} ({ct[:30]}): {r.text[:100]}")
            else:
                print(f"  ❌ {method} {path} → {status}")
        except Exception as e:
            print(f"  💥 {url} → {type(e).__name__}: {str(e)[:60]}")
        await asyncio.sleep(0.3)
    
    # Fetch Zepto JS bundle to find API
    print("\n[2] Fetching Zepto JS bundle for API paths...")
    try:
        js_url = "https://cdn.zeptonow.com/web-static-assets-prod/artifacts/15.23.2/_next/static/chunks/main-app-0ebe1be1417c11df.js"
        r = await client.get(js_url, headers={"User-Agent": UA_DESKTOP}, timeout=30)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            js = r.text
            print(f"  Bundle size: {len(js):,} chars")
            
            # Find API paths
            all_paths = set()
            for pat in [
                r'"(/api/v\d+/[^"]{5,60})"',
                r'["\`](/api/[a-zA-Z/v0-9_-]{5,60})["\`]',
                r'"(https://[^"]*zepto[^"]{5,80})"',
            ]:
                found = re.findall(pat, js)
                all_paths.update(found)
            
            print(f"  API paths ({len(all_paths)}):")
            for p in sorted(all_paths)[:30]:
                print(f"    {p}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Try Zepto with store_id header
    print("\n[3] Testing Zepto with store_id and location headers...")
    headers2 = {
        **headers,
        "x-store-id": "74f3e3b0-5a0e-4c1e-b6d0-9b3f2e1a8c5d",
        "x-latitude": "26.9124",
        "x-longitude": "75.7873",
        "x-app-version": "5.0.0",
        "x-platform": "web",
    }
    
    try:
        r = await client.post(
            "https://www.zeptonow.com/api/v3/search",
            json={"query": "milk", "pageNumber": 0, "pageSize": 20, "intent": False, "isRecommendation": False},
            headers=headers2,
            timeout=15
        )
        print(f"  zeptonow.com POST /api/v3/search → {r.status_code}")
        ct = r.headers.get("content-type", "")
        if "json" in ct:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")


async def main():
    print("🔍 Exploring APIs...")
    
    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,
        timeout=30,
    ) as client:
        await explore_bigbasket(client)
        await asyncio.sleep(2)
        await explore_blinkit_main_js(client)
        await asyncio.sleep(2)
        await explore_zepto(client)
    
    print("\n✅ Exploration complete!")

if __name__ == "__main__":
    asyncio.run(main())
