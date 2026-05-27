#!/usr/bin/env python3
"""
BigBasket Next.js data deep dive + Zepto chunk 9276 + alternative approaches
Run: backend/.venv_mac/bin/python3 scripts/test_final.py
"""
import asyncio
import json
import httpx
import re

UA_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

async def bigbasket_nextjs(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BIGBASKET - Next.js data API deep dive")
    print("="*60)
    
    # Get buildId
    r = await client.get("https://www.bigbasket.com/", headers={"User-Agent": UA_DESKTOP}, timeout=20)
    cookies = dict(r.cookies)
    html = r.text
    match = re.search(r'"buildId"\s*:\s*"([^"]+)"', html)
    build_id = match.group(1) if match else "iY69mbowHVUU2LNgwisfy"
    print(f"  buildId: {build_id}")
    
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "application/json",
        "Cookie": cookie_str,
    }
    
    # Test 1: Get full Next.js data response
    print(f"\n[1] Getting /_next/data/{build_id}/ps.json...")
    try:
        r = await client.get(
            f"https://www.bigbasket.com/_next/data/{build_id}/ps.json",
            params={"q": "milk"},
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            page_props = data.get("pageProps", {})
            print(f"  pageProps keys: {list(page_props.keys())}")
            
            # Print each key's type and size
            for k, v in page_props.items():
                if isinstance(v, dict):
                    print(f"  '{k}': dict with {len(v)} keys: {list(v.keys())[:8]}")
                elif isinstance(v, list):
                    print(f"  '{k}': list of {len(v)} items")
                else:
                    print(f"  '{k}': {type(v).__name__} = {str(v)[:100]}")
            
            # Save full response
            with open("/tmp/bb_nextjs.json", "w") as f:
                json.dump(data, f, indent=2)
            print("  Saved to /tmp/bb_nextjs.json")
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Try different search paths
    print(f"\n[2] Trying different Next.js data paths...")
    paths = [
        f"/_next/data/{build_id}/search.json",
        f"/_next/data/{build_id}/ps/milk.json",
    ]
    for path in paths:
        try:
            r = await client.get(
                f"https://www.bigbasket.com{path}",
                params={"q": "milk"},
                headers=headers,
                timeout=15
            )
            print(f"  {path} → {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"    Keys: {list(data.keys())}")
        except Exception as e:
            print(f"  {path} → Error: {e}")
    
    # Test 3: Try BigBasket's internal search API directly
    print("\n[3] Trying BigBasket internal search APIs...")
    apis = [
        ("GET", "https://www.bigbasket.com/product/get-products/", {"q": "milk", "nc": "as", "page": "1"}),
        ("GET", "https://www.bigbasket.com/search/", {"q": "milk", "nc": "as"}),
        ("GET", "https://www.bigbasket.com/product/search/", {"q": "milk"}),
        ("GET", "https://www.bigbasket.com/catalog/search/", {"q": "milk", "nc": "as"}),
        ("POST", "https://www.bigbasket.com/product/get-products/", None),
    ]
    
    for method, url, params in apis:
        try:
            if method == "GET":
                r = await client.get(url, params=params, headers={**headers, "Accept": "application/json, text/plain, */*"}, timeout=10)
            else:
                r = await client.post(url, json={"q": "milk"}, headers={**headers, "Content-Type": "application/json"}, timeout=10)
            
            ct = r.headers.get("content-type", "")
            path = url.split("bigbasket.com")[1]
            if r.status_code == 200 and "json" in ct:
                data = r.json()
                print(f"  ✅ {method} {path} → 200 JSON, keys: {list(data.keys())[:5]}")
                # Check if has products
                tab_info = data.get("tab_info", [])
                if tab_info:
                    print(f"    tab_info has {len(tab_info)} items!")
            else:
                print(f"  ❌ {method} {path} → {r.status_code} ({ct[:30]})")
        except Exception as e:
            print(f"  💥 {url.split('bigbasket.com')[1]} → {e}")
        await asyncio.sleep(0.5)


async def zepto_chunk_9276(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("ZEPTO - Analyze chunk 9276 (206KB)")
    print("="*60)
    
    url = "https://cdn.zeptonow.com/web-static-assets-prod/artifacts/15.23.2/_next/static/chunks/9276-e57800374f3c5add.js"
    print(f"\n[1] Fetching {url}...")
    try:
        r = await client.get(url, headers={"User-Agent": UA_DESKTOP}, timeout=60)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            js = r.text
            print(f"  Size: {len(js):,} chars")
            
            # Save for analysis
            with open("/tmp/zepto_9276.js", "w") as f:
                f.write(js)
            print("  Saved to /tmp/zepto_9276.js")
            
            # Search for API patterns more broadly
            print("\n  Searching for API patterns...")
            
            # Look for fetch calls
            fetch_patterns = re.findall(r'fetch\s*\(\s*["\`]([^"` ]+)["\`]', js)
            print(f"  fetch() calls: {fetch_patterns[:10]}")
            
            # Look for axios
            axios_patterns = re.findall(r'axios\.[a-z]+\s*\(\s*["\`]([^"` ]+)["\`]', js)
            print(f"  axios calls: {axios_patterns[:10]}")
            
            # Look for URL patterns
            url_patterns = re.findall(r'["\`]((?:https?://|/)[a-zA-Z0-9/_.-]{10,100})["\`]', js)
            url_patterns = [u for u in url_patterns if not u.endswith(('.png', '.jpg', '.svg', '.css', '.woff'))]
            url_patterns = list(set(url_patterns))
            print(f"\n  URL patterns ({len(url_patterns)}):")
            for u in sorted(url_patterns)[:30]:
                print(f"    {u}")
            
            # Look for "search" keyword context
            print("\n  'search' keyword context:")
            for m in re.finditer(r'.{0,80}["\`/]search["\`/].{0,80}', js):
                snippet = m.group(0)
                if any(c in snippet for c in ['"', '`', '/']):
                    print(f"    {snippet[:150]}")
            
            # Look for "query" keyword
            print("\n  'query' keyword context (first 5):")
            count = 0
            for m in re.finditer(r'.{0,40}query.{0,40}', js):
                snippet = m.group(0)
                if '"' in snippet or "'" in snippet:
                    print(f"    {snippet[:100]}")
                    count += 1
                    if count >= 5:
                        break
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()


async def zepto_with_store(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("ZEPTO - Test with store_id from cookies")
    print("="*60)
    
    # Get cookies from Zepto
    print("\n[1] Getting Zepto cookies and store info...")
    try:
        r = await client.get(
            "https://www.zeptonow.com/",
            headers={"User-Agent": UA_MOBILE},
            timeout=20
        )
        cookies = dict(r.cookies)
        print(f"  Cookies: {json.dumps(cookies, indent=2)}")
        
        # Look for store info in HTML
        html = r.text
        store_matches = re.findall(r'"storeId"\s*:\s*"([^"]+)"', html)
        print(f"  storeId in HTML: {store_matches[:3]}")
        
        store_matches2 = re.findall(r'"store_id"\s*:\s*"([^"]+)"', html)
        print(f"  store_id in HTML: {store_matches2[:3]}")
        
        # Look for serviceability cookie value
        serviceability = cookies.get("serviceability", "")
        print(f"  serviceability cookie: {serviceability[:200]}")
        
        # Try to decode serviceability
        if serviceability:
            try:
                import base64
                decoded = base64.b64decode(serviceability + "==").decode("utf-8", errors="ignore")
                print(f"  Decoded serviceability: {decoded[:200]}")
            except:
                pass
        
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        
        # Test with cookies
        headers = {
            "User-Agent": UA_MOBILE,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Cookie": cookie_str,
            "Origin": "https://www.zeptonow.com",
            "Referer": "https://www.zeptonow.com/search?query=milk",
            "X-XSRF-TOKEN": cookies.get("XSRF-TOKEN", ""),
        }
        
        # Try various Zepto endpoints
        print("\n[2] Testing Zepto endpoints with cookies...")
        endpoints = [
            ("POST", "https://www.zeptonow.com/api/v3/search", {"query": "milk", "pageNumber": 0, "pageSize": 20}),
            ("POST", "https://www.zeptonow.com/api/v2/search", {"query": "milk", "pageNumber": 0}),
            ("GET", "https://www.zeptonow.com/api/v3/search", {"query": "milk"}),
            ("POST", "https://www.zeptonow.com/api/v3/products/search", {"query": "milk"}),
            ("GET", "https://www.zeptonow.com/api/v3/products", {"query": "milk"}),
            ("POST", "https://www.zepto.com/api/v3/search", {"query": "milk", "pageNumber": 0, "pageSize": 20}),
        ]
        
        for method, url, payload in endpoints:
            try:
                if method == "POST":
                    r2 = await client.post(url, json=payload, headers=headers, timeout=10)
                else:
                    r2 = await client.get(url, params=payload, headers=headers, timeout=10)
                
                status = r2.status_code
                ct = r2.headers.get("content-type", "")
                domain = "zepto.com" if "zepto.com" in url else "zeptonow.com"
                path = url.split(domain)[1]
                
                if status == 200 and "json" in ct:
                    data = r2.json()
                    print(f"  ✅ {method} {domain}{path} → 200, keys: {list(data.keys())[:5]}")
                elif status not in [404]:
                    print(f"  ⚠️  {method} {domain}{path} → {status}: {r2.text[:100]}")
                else:
                    print(f"  ❌ {method} {domain}{path} → {status}")
            except Exception as e:
                print(f"  💥 {url} → {type(e).__name__}: {str(e)[:50]}")
            await asyncio.sleep(0.3)
    except Exception as e:
        print(f"  Error: {e}")


async def main():
    print("🔍 Final API investigation...")
    
    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,
        timeout=30,
    ) as client:
        await bigbasket_nextjs(client)
        await asyncio.sleep(2)
        await zepto_chunk_9276(client)
        await asyncio.sleep(2)
        await zepto_with_store(client)
    
    print("\n✅ Final tests complete!")

if __name__ == "__main__":
    asyncio.run(main())
