#!/usr/bin/env python3
"""
Extract BigBasket SSRData + Zepto large JS chunks + Blinkit HTML parsing
Run: backend/.venv_mac/bin/python3 scripts/test_ssr.py
"""
import asyncio
import json
import httpx
import re

UA_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

async def bigbasket_ssr(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BIGBASKET - Extract SSRData from search page")
    print("="*60)
    
    # Get cookies first
    r = await client.get("https://www.bigbasket.com/", headers={"User-Agent": UA_DESKTOP}, timeout=20)
    cookies = dict(r.cookies)
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Cookie": cookie_str,
    }
    
    # Test 1: Search page with SSRData
    print("\n[1] Getting BigBasket search page SSRData...")
    try:
        r = await client.get(
            "https://www.bigbasket.com/ps/",
            params={"q": "milk"},
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
        if match:
            next_data = json.loads(match.group(1))
            page_props = next_data.get("props", {}).get("pageProps", {})
            ssr_data = page_props.get("SSRData", {})
            
            print(f"  SSRData keys: {list(ssr_data.keys())[:20]}")
            
            # Save for analysis
            with open("/tmp/bb_ssr.json", "w") as f:
                json.dump(ssr_data, f, indent=2)
            print("  Saved to /tmp/bb_ssr.json")
            
            # Find products recursively
            def find_products(obj, path=""):
                if isinstance(obj, list) and len(obj) > 0:
                    if isinstance(obj[0], dict):
                        keys = set(obj[0].keys())
                        # BigBasket product keys
                        if keys & {"sp", "mrp", "desc", "w", "u", "id", "sku"}:
                            print(f"  ✅ Products at '{path}': {len(obj)} items")
                            p = obj[0]
                            print(f"     Keys: {list(p.keys())[:15]}")
                            print(f"     name: {p.get('desc', p.get('name', '?'))}")
                            print(f"     price: {p.get('sp', p.get('price', '?'))}")
                            print(f"     mrp: {p.get('mrp', '?')}")
                            return True
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        if find_products(v, f"{path}.{k}"):
                            return True
                elif isinstance(obj, list):
                    for i, item in enumerate(obj[:5]):
                        if find_products(item, f"{path}[{i}]"):
                            return True
                return False
            
            found = find_products(ssr_data)
            if not found:
                print("  No products found in SSRData")
                print(f"  SSRData sample: {json.dumps(ssr_data)[:500]}")
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Try the _next/data API (Next.js data fetching)
    print("\n[2] Trying Next.js data API...")
    try:
        # Get buildId from homepage
        r = await client.get("https://www.bigbasket.com/", headers=headers, timeout=20)
        html = r.text
        match = re.search(r'"buildId"\s*:\s*"([^"]+)"', html)
        build_id = match.group(1) if match else None
        print(f"  buildId: {build_id}")
        
        if build_id:
            r2 = await client.get(
                f"https://www.bigbasket.com/_next/data/{build_id}/ps.json",
                params={"q": "milk"},
                headers={**headers, "Accept": "application/json"},
                timeout=20
            )
            print(f"  Status: {r2.status_code}")
            ct = r2.headers.get("content-type", "")
            if "json" in ct and r2.status_code == 200:
                data = r2.json()
                print(f"  Keys: {list(data.keys())}")
                page_props = data.get("pageProps", {})
                ssr_data = page_props.get("SSRData", {})
                print(f"  SSRData keys: {list(ssr_data.keys())[:10]}")
            else:
                print(f"  Body: {r2.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 3: Try BB Now search page
    print("\n[3] Trying BB Now search page...")
    try:
        r = await client.get(
            "https://www.bigbasket.com/bbnow/",
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        match = re.search(r'"buildId"\s*:\s*"([^"]+)"', html)
        build_id = match.group(1) if match else None
        print(f"  buildId: {build_id}")
        
        # Look for API calls in HTML
        api_calls = re.findall(r'"(https://[^"]*bigbasket[^"]{10,80})"', html)
        api_calls = list(set(api_calls))[:10]
        print(f"  API calls: {api_calls}")
    except Exception as e:
        print(f"  Error: {e}")


async def zepto_large_js(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("ZEPTO - Find API in large JS chunks")
    print("="*60)
    
    # Get all JS bundles from search page
    print("\n[1] Getting all JS bundles from Zepto...")
    try:
        r = await client.get(
            "https://www.zeptonow.com/search",
            params={"query": "milk"},
            headers={"User-Agent": UA_MOBILE},
            timeout=20
        )
        html = r.text
        
        # Get all JS bundles
        all_bundles = re.findall(r'"(https://cdn\.zeptonow\.com[^"]+\.js)"', html)
        all_bundles = list(set(all_bundles))
        
        # Sort by likely size (larger numbered chunks tend to be bigger)
        print(f"  Total bundles: {len(all_bundles)}")
        
        # Find the largest bundles (by chunk number - higher = more code)
        numbered = [(b, re.search(r'chunks/(\d+)-', b)) for b in all_bundles]
        numbered = [(b, int(m.group(1))) for b, m in numbered if m]
        numbered.sort(key=lambda x: x[1], reverse=True)
        
        print(f"  Top numbered chunks: {[b for b, n in numbered[:5]]}")
        
        # Fetch the top chunks and search for API
        for bundle_url, num in numbered[:5]:
            try:
                r2 = await client.get(bundle_url, headers={"User-Agent": UA_DESKTOP}, timeout=30)
                if r2.status_code == 200:
                    js = r2.text
                    size = len(js)
                    
                    # Find API paths
                    api_paths = set()
                    for pat in [
                        r'["\`](/api/v\d+/[^"` ]{5,80})["\`]',
                        r'"(https://[^"]*zepto[^"]{5,80})"',
                        r'baseURL[:\s=]+["\`]([^"` ]+)["\`]',
                    ]:
                        found = re.findall(pat, js)
                        api_paths.update(found)
                    
                    if api_paths:
                        print(f"\n  ✅ Chunk {num} ({size:,} chars) has API paths:")
                        for p in sorted(api_paths)[:15]:
                            print(f"    {p}")
                    else:
                        print(f"  Chunk {num}: {size:,} chars, no API paths")
            except Exception as e:
                print(f"  Chunk {num} error: {e}")
            await asyncio.sleep(0.3)
        
        # Also try the non-numbered chunks
        non_numbered = [b for b in all_bundles if not re.search(r'chunks/\d+-', b)]
        print(f"\n  Non-numbered bundles: {non_numbered[:5]}")
        
        for bundle_url in non_numbered[:3]:
            try:
                r2 = await client.get(bundle_url, headers={"User-Agent": UA_DESKTOP}, timeout=30)
                if r2.status_code == 200:
                    js = r2.text
                    size = len(js)
                    
                    api_paths = set()
                    for pat in [
                        r'["\`](/api/v\d+/[^"` ]{5,80})["\`]',
                        r'"(https://[^"]*zepto[^"]{5,80})"',
                    ]:
                        found = re.findall(pat, js)
                        api_paths.update(found)
                    
                    name = bundle_url.split("/")[-1]
                    if api_paths:
                        print(f"\n  ✅ {name} ({size:,} chars) has API paths:")
                        for p in sorted(api_paths)[:10]:
                            print(f"    {p}")
                    else:
                        print(f"  {name}: {size:,} chars, no API paths")
            except Exception as e:
                print(f"  Error: {e}")
            await asyncio.sleep(0.3)
            
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()


async def blinkit_html_parse(client: httpx.AsyncClient):
    print("\n" + "="*60)
    print("BLINKIT - Parse search page HTML for products")
    print("="*60)
    
    # Get cookies
    r = await client.get("https://blinkit.com/", headers={"User-Agent": UA_DESKTOP}, timeout=20)
    cookies = dict(r.cookies)
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    
    headers = {
        "User-Agent": UA_DESKTOP,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
        "Cookie": cookie_str,
    }
    
    # Test search page
    print("\n[1] Parsing Blinkit search page...")
    try:
        r = await client.get(
            "https://blinkit.com/s/",
            params={"q": "milk"},
            headers=headers,
            timeout=20
        )
        print(f"  Status: {r.status_code}")
        html = r.text
        print(f"  HTML size: {len(html):,} chars")
        
        # Save for analysis
        with open("/tmp/blinkit_search.html", "w") as f:
            f.write(html)
        print("  Saved to /tmp/blinkit_search.html")
        
        # Look for product data patterns
        patterns = {
            "product_name": r'"product_name"\s*:\s*"([^"]+)"',
            "selling_price": r'"selling_price"\s*:\s*(\d+)',
            "name": r'"name"\s*:\s*"([^"]{5,50})"',
            "price": r'"price"\s*:\s*(\d+)',
            "mrp": r'"mrp"\s*:\s*(\d+)',
        }
        
        for key, pat in patterns.items():
            matches = re.findall(pat, html)
            if matches:
                print(f"  '{key}': {len(matches)} found, first: {matches[:3]}")
        
        # Look for __NEXT_DATA__
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
        if match:
            try:
                next_data = json.loads(match.group(1))
                print(f"\n  NEXT_DATA keys: {list(next_data.keys())}")
                props = next_data.get("props", {})
                page_props = props.get("pageProps", {})
                print(f"  pageProps keys: {list(page_props.keys())[:15]}")
                
                # Save pageProps
                with open("/tmp/blinkit_next_data.json", "w") as f:
                    json.dump(page_props, f, indent=2)
                print("  pageProps saved to /tmp/blinkit_next_data.json")
            except Exception as e:
                print(f"  NEXT_DATA parse error: {e}")
        
        # Look for window.__data or similar
        data_vars = re.findall(r'window\.__([A-Z_]+)\s*=\s*(\{[^;]{10,200})', html)
        for var, val in data_vars[:5]:
            print(f"  window.__{var}: {val[:100]}")
        
        # Look for inline JSON with products
        json_blocks = re.findall(r'\{[^{}]*"product_id"[^{}]*\}', html)
        if json_blocks:
            print(f"  Found {len(json_blocks)} product JSON blocks")
            print(f"  First: {json_blocks[0][:200]}")
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test Blinkit utility.js for API paths
    print("\n[2] Fetching Blinkit utility.js for API paths...")
    try:
        r = await client.get(
            "https://blinkit.com/scripts/utility.acbd54663c1b03cd0fc5.js",
            headers={"User-Agent": UA_DESKTOP},
            timeout=30
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            js = r.text
            print(f"  Size: {len(js):,} chars")
            
            # Find all API paths
            api_paths = set()
            for pat in [
                r'"(/v\d+/[^"]{5,80})"',
                r'["\`](/api/[^"` ]{5,80})["\`]',
                r'path:\s*["\`](/[^"` ]{5,80})["\`]',
            ]:
                found = re.findall(pat, js)
                api_paths.update(found)
            
            print(f"  API paths ({len(api_paths)}):")
            for p in sorted(api_paths)[:30]:
                print(f"    {p}")
    except Exception as e:
        print(f"  Error: {e}")


async def main():
    print("🔍 SSR/HTML extraction tests...")
    
    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,
        timeout=30,
    ) as client:
        await bigbasket_ssr(client)
        await asyncio.sleep(2)
        await zepto_large_js(client)
        await asyncio.sleep(2)
        await blinkit_html_parse(client)
    
    print("\n✅ Tests complete!")

if __name__ == "__main__":
    asyncio.run(main())
