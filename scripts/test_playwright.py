#!/usr/bin/env python3
"""
Use Playwright to intercept network requests from Blinkit, Zepto, BigBasket, Instamart.
This bypasses Cloudflare by running a real browser.
Run: backend/.venv_mac/bin/python3 scripts/test_playwright.py
"""
import asyncio
import json
import re
from playwright.async_api import async_playwright

async def intercept_blinkit():
    print("\n" + "="*60)
    print("BLINKIT - Intercept API calls via Playwright")
    print("="*60)
    
    api_calls = []
    
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
        
        # Intercept all API requests
        async def handle_request(request):
            url = request.url
            method = request.method
            if any(x in url for x in ["/v1/", "/v2/", "/v3/", "/v4/", "/v5/", "/v6/", "/api/", "search", "listing", "product"]):
                if "blinkit.com" in url or "grofers.com" in url:
                    headers = dict(request.headers)
                    post_data = request.post_data
                    api_calls.append({
                        "method": method,
                        "url": url,
                        "headers": {k: v for k, v in headers.items() if k.lower() in ["content-type", "lat", "lon", "app_client", "app_version", "web_app_version", "authorization"]},
                        "body": post_data,
                    })
                    print(f"  📡 {method} {url[:100]}")
        
        page.on("request", handle_request)
        
        # Navigate to Blinkit
        print("\n[1] Loading Blinkit homepage...")
        try:
            await page.goto("https://blinkit.com/", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  Error: {e}")
        
        # Search for milk
        print("\n[2] Searching for 'milk'...")
        try:
            await page.goto("https://blinkit.com/s/?q=milk", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"  Error: {e}")
        
        print(f"\n  Total API calls intercepted: {len(api_calls)}")
        for call in api_calls[:20]:
            print(f"\n  {call['method']} {call['url']}")
            if call['headers']:
                print(f"    Headers: {call['headers']}")
            if call['body']:
                print(f"    Body: {call['body'][:200]}")
        
        # Save all calls
        with open("/tmp/blinkit_api_calls.json", "w") as f:
            json.dump(api_calls, f, indent=2)
        print(f"\n  Saved to /tmp/blinkit_api_calls.json")
        
        await browser.close()
    
    return api_calls


async def intercept_zepto():
    print("\n" + "="*60)
    print("ZEPTO - Intercept API calls via Playwright")
    print("="*60)
    
    api_calls = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},  # Mobile viewport
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            locale="en-IN",
            geolocation={"latitude": 26.9124, "longitude": 75.7873},
            permissions=["geolocation"],
        )
        
        page = await context.new_page()
        
        # Intercept all requests
        async def handle_request(request):
            url = request.url
            method = request.method
            if any(x in url for x in ["/api/", "search", "product", "catalog"]):
                if "zepto" in url.lower():
                    headers = dict(request.headers)
                    post_data = request.post_data
                    api_calls.append({
                        "method": method,
                        "url": url,
                        "headers": {k: v for k, v in headers.items() if k.lower() not in ["accept-encoding", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform"]},
                        "body": post_data,
                    })
                    print(f"  📡 {method} {url[:120]}")
        
        page.on("request", handle_request)
        
        # Navigate to Zepto
        print("\n[1] Loading Zepto homepage...")
        try:
            await page.goto("https://www.zeptonow.com/", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  Error: {e}")
        
        # Search for milk
        print("\n[2] Searching for 'milk'...")
        try:
            await page.goto("https://www.zeptonow.com/search?query=milk", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"  Error: {e}")
        
        print(f"\n  Total API calls intercepted: {len(api_calls)}")
        for call in api_calls[:20]:
            print(f"\n  {call['method']} {call['url']}")
            if call['headers']:
                # Show important headers
                important = {k: v for k, v in call['headers'].items() if k.lower() in ["content-type", "x-store-id", "x-latitude", "x-longitude", "authorization", "x-app-version", "x-platform", "x-xsrf-token"]}
                if important:
                    print(f"    Key Headers: {important}")
            if call['body']:
                print(f"    Body: {call['body'][:300]}")
        
        # Save all calls
        with open("/tmp/zepto_api_calls.json", "w") as f:
            json.dump(api_calls, f, indent=2)
        print(f"\n  Saved to /tmp/zepto_api_calls.json")
        
        await browser.close()
    
    return api_calls


async def intercept_bigbasket():
    print("\n" + "="*60)
    print("BIGBASKET - Intercept API calls via Playwright")
    print("="*60)
    
    api_calls = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-IN",
        )
        
        page = await context.new_page()
        
        # Intercept all requests
        async def handle_request(request):
            url = request.url
            method = request.method
            if "bigbasket.com" in url and any(x in url for x in ["/api/", "search", "product", "listing", "catalog", "get-products"]):
                headers = dict(request.headers)
                post_data = request.post_data
                api_calls.append({
                    "method": method,
                    "url": url,
                    "headers": {k: v for k, v in headers.items() if k.lower() in ["content-type", "x-channel", "cookie", "x-csrftoken"]},
                    "body": post_data,
                })
                print(f"  📡 {method} {url[:120]}")
        
        page.on("request", handle_request)
        
        # Navigate to BigBasket
        print("\n[1] Loading BigBasket homepage...")
        try:
            await page.goto("https://www.bigbasket.com/", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  Error: {e}")
        
        # Search for milk
        print("\n[2] Searching for 'milk'...")
        try:
            await page.goto("https://www.bigbasket.com/ps/?q=milk", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"  Error: {e}")
        
        print(f"\n  Total API calls intercepted: {len(api_calls)}")
        for call in api_calls[:20]:
            print(f"\n  {call['method']} {call['url']}")
            if call['body']:
                print(f"    Body: {call['body'][:200]}")
        
        # Save all calls
        with open("/tmp/bigbasket_api_calls.json", "w") as f:
            json.dump(api_calls, f, indent=2)
        print(f"\n  Saved to /tmp/bigbasket_api_calls.json")
        
        await browser.close()
    
    return api_calls


async def intercept_instamart():
    print("\n" + "="*60)
    print("INSTAMART - Intercept API calls via Playwright")
    print("="*60)
    
    api_calls = []
    
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
        
        # Intercept all requests
        async def handle_request(request):
            url = request.url
            method = request.method
            if "swiggy.com" in url and any(x in url for x in ["/api/", "search", "instamart", "product"]):
                headers = dict(request.headers)
                post_data = request.post_data
                api_calls.append({
                    "method": method,
                    "url": url,
                    "headers": {k: v for k, v in headers.items() if k.lower() in ["content-type", "authorization", "x-build-id"]},
                    "body": post_data,
                })
                print(f"  📡 {method} {url[:120]}")
        
        page.on("request", handle_request)
        
        # Navigate to Instamart
        print("\n[1] Loading Swiggy Instamart...")
        try:
            await page.goto("https://www.swiggy.com/instamart", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  Error: {e}")
        
        # Search
        print("\n[2] Searching for 'milk'...")
        try:
            await page.goto("https://www.swiggy.com/instamart/search?query=milk", wait_until="networkidle", timeout=30000)
            print(f"  Title: {await page.title()}")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"  Error: {e}")
        
        print(f"\n  Total API calls intercepted: {len(api_calls)}")
        for call in api_calls[:20]:
            print(f"\n  {call['method']} {call['url']}")
            if call['body']:
                print(f"    Body: {call['body'][:200]}")
        
        # Save all calls
        with open("/tmp/instamart_api_calls.json", "w") as f:
            json.dump(api_calls, f, indent=2)
        print(f"\n  Saved to /tmp/instamart_api_calls.json")
        
        await browser.close()
    
    return api_calls


async def main():
    print("🎭 Playwright API Interception Test")
    print("This will open real browsers to capture actual API calls\n")
    
    # Run all interceptors
    blinkit_calls = await intercept_blinkit()
    await asyncio.sleep(2)
    
    zepto_calls = await intercept_zepto()
    await asyncio.sleep(2)
    
    bigbasket_calls = await intercept_bigbasket()
    await asyncio.sleep(2)
    
    instamart_calls = await intercept_instamart()
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Blinkit API calls: {len(blinkit_calls)}")
    print(f"Zepto API calls: {len(zepto_calls)}")
    print(f"BigBasket API calls: {len(bigbasket_calls)}")
    print(f"Instamart API calls: {len(instamart_calls)}")
    print("\nFiles saved:")
    print("  /tmp/blinkit_api_calls.json")
    print("  /tmp/zepto_api_calls.json")
    print("  /tmp/bigbasket_api_calls.json")
    print("  /tmp/instamart_api_calls.json")

if __name__ == "__main__":
    asyncio.run(main())
