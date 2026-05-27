#!/usr/bin/env python3
"""
Debug Playwright scraper - capture and print raw API responses.
Run: backend/.venv_mac/bin/python3 scripts/debug_playwright.py
"""
import asyncio
import json
from playwright.async_api import async_playwright

async def debug_blinkit():
    print("\n" + "="*60)
    print("BLINKIT DEBUG")
    print("="*60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
            geolocation={"latitude": 26.9124, "longitude": 75.7873},
            permissions=["geolocation"],
        )
        
        page = await context.new_page()
        responses_captured = []
        
        async def on_response(response):
            url = response.url
            if "blinkit.com" in url and "/v1/layout/search" in url:
                try:
                    data = await response.json()
                    responses_captured.append({"url": url, "data": data})
                    print(f"\n  ✅ Captured: {url[:80]}")
                    print(f"  Top keys: {list(data.keys())[:10]}")
                    # Print structure
                    snippets = data.get("snippets", [])
                    print(f"  snippets count: {len(snippets)}")
                    if snippets:
                        print(f"  First snippet keys: {list(snippets[0].keys())[:10]}")
                        first = snippets[0]
                        widget_type = first.get("widget_type", "")
                        print(f"  widget_type: {widget_type}")
                        data_inner = first.get("data", {})
                        print(f"  data keys: {list(data_inner.keys())[:10]}")
                        # Save full response
                        with open(f"/tmp/blinkit_response.json", "w") as f:
                            json.dump(data, f, indent=2)
                        print("  Saved to /tmp/blinkit_response.json")
                except Exception as e:
                    print(f"  Error parsing response: {e}")
        
        page.on("response", on_response)
        
        # Warm up
        print("\n[1] Loading homepage...")
        await page.goto("https://blinkit.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        print(f"  Title: {await page.title()}")
        
        # Search
        print("\n[2] Searching for milk...")
        await page.goto("https://blinkit.com/s/?q=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        print(f"  Title: {await page.title()}")
        print(f"  Responses captured: {len(responses_captured)}")
        
        # Try direct API call from browser
        print("\n[3] Direct API call from browser context...")
        result = await page.evaluate("""
            async () => {
                try {
                    const r = await fetch('/v1/layout/search?q=milk&search_type=type_to_search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'app_client': 'consumer_web',
                            'app_version': '1010101010',
                            'web_app_version': '1008010016',
                        },
                        body: JSON.stringify({
                            applied_filters: null,
                            monet_assets: [],
                            postback_meta: {}
                        })
                    });
                    const data = await r.json();
                    return {status: r.status, keys: Object.keys(data), snippets_count: (data.snippets || []).length, data: data};
                } catch(e) {
                    return {error: String(e)};
                }
            }
        """)
        print(f"  Result: status={result.get('status')}, keys={result.get('keys')}, snippets={result.get('snippets_count')}")
        if result.get("error"):
            print(f"  Error: {result['error']}")
        elif result.get("data"):
            data = result["data"]
            snippets = data.get("snippets", [])
            print(f"  snippets: {len(snippets)}")
            if snippets:
                for i, s in enumerate(snippets[:3]):
                    print(f"  snippet[{i}]: widget_type={s.get('widget_type')}, data_keys={list(s.get('data', {}).keys())[:5]}")
                    inner_data = s.get("data", {})
                    for k, v in inner_data.items():
                        if isinstance(v, list):
                            print(f"    '{k}': list of {len(v)}")
                            if v and isinstance(v[0], dict):
                                print(f"      first item keys: {list(v[0].keys())[:10]}")
                                print(f"      first item: {json.dumps(v[0])[:300]}")
            with open("/tmp/blinkit_direct.json", "w") as f:
                json.dump(data, f, indent=2)
            print("  Saved to /tmp/blinkit_direct.json")
        
        await browser.close()


async def debug_zepto():
    print("\n" + "="*60)
    print("ZEPTO DEBUG")
    print("="*60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="en-IN",
            geolocation={"latitude": 26.9124, "longitude": 75.7873},
            permissions=["geolocation"],
        )
        
        page = await context.new_page()
        responses_captured = []
        
        async def on_response(response):
            url = response.url
            if "zepto" in url.lower() and "user-search-service" in url:
                try:
                    data = await response.json()
                    responses_captured.append({"url": url, "data": data})
                    print(f"\n  ✅ Captured: {url[:80]}")
                    print(f"  Top keys: {list(data.keys())[:10]}")
                    with open("/tmp/zepto_response.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print("  Saved to /tmp/zepto_response.json")
                except Exception as e:
                    print(f"  Error: {e}")
        
        page.on("response", on_response)
        
        print("\n[1] Loading Zepto homepage...")
        await page.goto("https://www.zeptonow.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        
        print("\n[2] Searching for milk...")
        await page.goto("https://www.zeptonow.com/search?query=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        print(f"  Responses captured: {len(responses_captured)}")
        
        if responses_captured:
            data = responses_captured[0]["data"]
            print(f"  Top keys: {list(data.keys())}")
            # Explore structure
            def explore(obj, path="", depth=0):
                if depth > 4:
                    return
                if isinstance(obj, list) and obj:
                    print(f"  {path}: list[{len(obj)}]")
                    if isinstance(obj[0], dict):
                        print(f"  {path}[0] keys: {list(obj[0].keys())[:10]}")
                        if any(k in obj[0] for k in ["name", "price", "mrp", "sellingPrice"]):
                            print(f"  ✅ PRODUCTS FOUND at {path}!")
                            print(f"  Sample: {json.dumps(obj[0])[:300]}")
                            return
                        for k, v in obj[0].items():
                            explore(v, f"{path}[0].{k}", depth+1)
                elif isinstance(obj, dict):
                    for k, v in obj.items():
                        explore(v, f"{path}.{k}", depth+1)
            explore(data)
        
        await browser.close()


async def debug_instamart():
    print("\n" + "="*60)
    print("INSTAMART DEBUG")
    print("="*60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="en-IN",
            geolocation={"latitude": 26.9124, "longitude": 75.7873},
            permissions=["geolocation"],
        )
        
        page = await context.new_page()
        responses_captured = []
        
        async def on_response(response):
            url = response.url
            if "swiggy.com" in url and "instamart" in url and "search" in url:
                try:
                    data = await response.json()
                    responses_captured.append({"url": url, "data": data})
                    print(f"\n  ✅ Captured: {url[:80]}")
                    print(f"  Top keys: {list(data.keys())[:10]}")
                    with open("/tmp/instamart_response.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print("  Saved to /tmp/instamart_response.json")
                except Exception as e:
                    print(f"  Error: {e}")
        
        page.on("response", on_response)
        
        print("\n[1] Loading Instamart...")
        await page.goto("https://www.swiggy.com/instamart", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        
        print("\n[2] Searching for milk...")
        await page.goto("https://www.swiggy.com/instamart/search?query=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        print(f"  Responses captured: {len(responses_captured)}")
        
        if responses_captured:
            data = responses_captured[0]["data"]
            print(f"  Top keys: {list(data.keys())}")
            def explore(obj, path="", depth=0):
                if depth > 4:
                    return
                if isinstance(obj, list) and obj:
                    print(f"  {path}: list[{len(obj)}]")
                    if isinstance(obj[0], dict):
                        print(f"  {path}[0] keys: {list(obj[0].keys())[:10]}")
                        if any(k in obj[0] for k in ["name", "price", "mrp", "display_name", "offer_price"]):
                            print(f"  ✅ PRODUCTS FOUND at {path}!")
                            print(f"  Sample: {json.dumps(obj[0])[:300]}")
                            return
                        for k, v in obj[0].items():
                            explore(v, f"{path}[0].{k}", depth+1)
                elif isinstance(obj, dict):
                    for k, v in obj.items():
                        explore(v, f"{path}.{k}", depth+1)
            explore(data)
        
        await browser.close()


async def debug_bigbasket():
    print("\n" + "="*60)
    print("BIGBASKET DEBUG")
    print("="*60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
        )
        
        page = await context.new_page()
        responses_captured = []
        
        async def on_response(response):
            url = response.url
            if "bigbasket.com" in url and ("get-products" in url or "listing-svc" in url):
                try:
                    data = await response.json()
                    responses_captured.append({"url": url, "data": data})
                    print(f"\n  ✅ Captured: {url[:80]}")
                    print(f"  Top keys: {list(data.keys())[:10]}")
                    with open("/tmp/bigbasket_response.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print("  Saved to /tmp/bigbasket_response.json")
                except Exception as e:
                    print(f"  Error: {e}")
        
        page.on("response", on_response)
        
        print("\n[1] Loading BigBasket homepage...")
        await page.goto("https://www.bigbasket.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        
        print("\n[2] Searching for milk...")
        await page.goto("https://www.bigbasket.com/ps/?q=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        print(f"  Responses captured: {len(responses_captured)}")
        
        # Try direct API call
        print("\n[3] Direct API call from browser...")
        result = await page.evaluate("""
            async () => {
                try {
                    const r = await fetch('/product/get-products/?q=milk&nc=as', {
                        headers: {Accept: 'application/json'}
                    });
                    const data = await r.json();
                    return {status: r.status, keys: Object.keys(data), tab_info_len: (data.tab_info || []).length, data: data};
                } catch(e) {
                    return {error: String(e)};
                }
            }
        """)
        print(f"  Status: {result.get('status')}, keys: {result.get('keys')}, tab_info: {result.get('tab_info_len')}")
        if result.get("data"):
            data = result["data"]
            tab_info = data.get("tab_info", [])
            print(f"  tab_info length: {len(tab_info)}")
            if tab_info:
                print(f"  First tab keys: {list(tab_info[0].keys()) if isinstance(tab_info[0], dict) else tab_info[0]}")
                # Explore
                for tab in tab_info[:2]:
                    if isinstance(tab, dict):
                        for k, v in tab.items():
                            if isinstance(v, list) and v:
                                print(f"  tab.{k}: list[{len(v)}]")
                                if isinstance(v[0], dict):
                                    print(f"    first keys: {list(v[0].keys())[:10]}")
                                    print(f"    sample: {json.dumps(v[0])[:200]}")
            with open("/tmp/bigbasket_direct.json", "w") as f:
                json.dump(data, f, indent=2)
            print("  Saved to /tmp/bigbasket_direct.json")
        
        await browser.close()


async def main():
    print("🔍 Playwright Debug - Capture Raw API Responses")
    await debug_blinkit()
    await asyncio.sleep(2)
    await debug_zepto()
    await asyncio.sleep(2)
    await debug_instamart()
    await asyncio.sleep(2)
    await debug_bigbasket()
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(main())
