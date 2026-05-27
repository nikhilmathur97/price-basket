#!/usr/bin/env python3
"""
Quick debug - capture and print exact Blinkit + Zepto response structures.
Run: backend/.venv_mac/bin/python3 scripts/debug_structure.py
"""
import asyncio
import json
from playwright.async_api import async_playwright

async def debug_blinkit_structure():
    print("\n=== BLINKIT RESPONSE STRUCTURE ===")
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
        captured = []

        async def on_response(response):
            if "blinkit.com/v1/layout/search" in response.url:
                try:
                    data = await response.json()
                    captured.append(data)
                    with open("/tmp/blinkit_raw.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print(f"Captured: {response.url[:80]}")
                except Exception as e:
                    print(f"Error: {e}")

        page.on("response", on_response)
        await page.goto("https://blinkit.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(1)
        await page.goto("https://blinkit.com/s/?q=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        if captured:
            data = captured[0]
            print(f"\nTop keys: {list(data.keys())}")
            
            # Explore 'response' key
            resp = data.get("response", {})
            print(f"\n'response' type: {type(resp).__name__}")
            if isinstance(resp, dict):
                print(f"'response' keys: {list(resp.keys())[:15]}")
                for k, v in resp.items():
                    if isinstance(v, list):
                        print(f"  response.{k}: list[{len(v)}]")
                        if v and isinstance(v[0], dict):
                            print(f"    first item keys: {list(v[0].keys())[:10]}")
                    elif isinstance(v, dict):
                        print(f"  response.{k}: dict with keys {list(v.keys())[:8]}")
                    else:
                        print(f"  response.{k}: {type(v).__name__} = {str(v)[:50]}")
            elif isinstance(resp, list):
                print(f"'response' is list of {len(resp)}")
                if resp:
                    print(f"  first item keys: {list(resp[0].keys())[:10]}")
            
            # Deep explore to find products
            print("\n--- Deep exploration ---")
            def find_products(obj, path="", depth=0):
                if depth > 6:
                    return
                if isinstance(obj, list) and obj and isinstance(obj[0], dict):
                    keys = set(obj[0].keys())
                    if keys & {"name", "price", "mrp", "selling_price", "product_name", "product_id"}:
                        print(f"✅ PRODUCTS at '{path}' ({len(obj)} items)")
                        print(f"   keys: {list(obj[0].keys())[:15]}")
                        print(f"   sample: {json.dumps(obj[0])[:500]}")
                        return
                    for k, v in list(obj[0].items())[:8]:
                        find_products(v, f"{path}[0].{k}", depth+1)
                elif isinstance(obj, dict):
                    for k, v in list(obj.items())[:15]:
                        find_products(v, f"{path}.{k}", depth+1)
                elif isinstance(obj, list):
                    for i, item in enumerate(obj[:3]):
                        find_products(item, f"{path}[{i}]", depth+1)
            
            find_products(data)
        else:
            print("No responses captured!")
        
        await browser.close()


async def debug_zepto_structure():
    print("\n=== ZEPTO RESPONSE STRUCTURE ===")
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
        captured = []

        async def on_response(response):
            if "user-search-service/api/v3/search" in response.url:
                try:
                    data = await response.json()
                    captured.append(data)
                    with open("/tmp/zepto_raw.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print(f"Captured: {response.url[:80]}")
                except Exception as e:
                    print(f"Error: {e}")

        page.on("response", on_response)
        await page.goto("https://www.zeptonow.com/", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(1)
        await page.goto("https://www.zeptonow.com/search?query=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        if captured:
            data = captured[0]
            print(f"\nTop keys: {list(data.keys())}")
            
            # Explore layout
            layout = data.get("layout", [])
            print(f"\nlayout: list[{len(layout)}]")
            for i, widget in enumerate(layout[:5]):
                wtype = widget.get("widgetType", widget.get("widgetName", "?"))
                wdata = widget.get("data", {})
                print(f"\n  layout[{i}] widgetType={wtype}")
                print(f"    data keys: {list(wdata.keys())[:10]}")
                for k, v in wdata.items():
                    if isinstance(v, list) and v:
                        print(f"    data.{k}: list[{len(v)}]")
                        if isinstance(v[0], dict):
                            print(f"      first keys: {list(v[0].keys())[:10]}")
                            if any(key in v[0] for key in ["name", "price", "mrp", "sellingPrice", "discountedSellingPrice", "productId"]):
                                print(f"      ✅ PRODUCTS HERE!")
                                print(f"      sample: {json.dumps(v[0])[:400]}")
        else:
            print("No responses captured!")
        
        await browser.close()


async def debug_instamart_structure():
    print("\n=== INSTAMART RESPONSE STRUCTURE ===")
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
        captured = []

        async def on_response(response):
            url = response.url
            # Capture ALL swiggy API calls
            if "swiggy.com" in url and response.status == 200:
                ct = response.headers.get("content-type", "")
                if "json" in ct:
                    try:
                        data = await response.json()
                        path = url.split("swiggy.com")[1].split("?")[0]
                        captured.append({"url": url, "path": path, "data": data})
                        print(f"  JSON: {path[:60]}")
                    except Exception:
                        pass

        page.on("response", on_response)
        await page.goto("https://www.swiggy.com/instamart", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(1)
        await page.goto("https://www.swiggy.com/instamart/search?query=milk", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        print(f"\nTotal JSON responses: {len(captured)}")
        for item in captured:
            path = item["path"]
            data = item["data"]
            if "search" in path.lower() or "instamart" in path.lower():
                print(f"\n  Path: {path}")
                print(f"  Keys: {list(data.keys())[:10]}")
                with open("/tmp/instamart_raw.json", "w") as f:
                    json.dump(data, f, indent=2)
                print("  Saved to /tmp/instamart_raw.json")
                
                # Find products
                def find_products(obj, path2="", depth=0):
                    if depth > 6:
                        return
                    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
                        keys = set(obj[0].keys())
                        if keys & {"name", "price", "mrp", "display_name", "offer_price", "skuId"}:
                            print(f"  ✅ PRODUCTS at '{path2}' ({len(obj)} items)")
                            print(f"     keys: {list(obj[0].keys())[:15]}")
                            print(f"     sample: {json.dumps(obj[0])[:400]}")
                            return
                        for k, v in list(obj[0].items())[:8]:
                            find_products(v, f"{path2}[0].{k}", depth+1)
                    elif isinstance(obj, dict):
                        for k, v in list(obj.items())[:15]:
                            find_products(v, f"{path2}.{k}", depth+1)
                    elif isinstance(obj, list):
                        for i, item2 in enumerate(obj[:3]):
                            find_products(item2, f"{path2}[{i}]", depth+1)
                
                find_products(data)
        
        await browser.close()


async def main():
    await debug_blinkit_structure()
    await asyncio.sleep(2)
    await debug_zepto_structure()
    await asyncio.sleep(2)
    await debug_instamart_structure()
    print("\n✅ Done!")

if __name__ == "__main__":
    asyncio.run(main())
