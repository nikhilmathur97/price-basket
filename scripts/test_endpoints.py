#!/usr/bin/env python3
"""
Test all platform endpoints to find what works.
Run: python scripts/test_endpoints.py
"""
import asyncio
import json
import httpx
import time

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

async def test_blinkit(client: httpx.AsyncClient):
    print("\n" + "="*50)
    print("BLINKIT TESTS")
    print("="*50)
    
    base = "https://blinkit.com"
    
    # Common headers for Blinkit
    headers = {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://blinkit.com/",
        "Origin": "https://blinkit.com",
        "app_client": "consumer_web",
        "app_version": "1000",
        "web_app_version": "1001",
        "lat": "26.9124",
        "lon": "75.7873",
        "device_id": "web_test_123",
    }
    
    # Test 1: New listing_widgets endpoint
    print("\n[1] Testing /v1/layout/listing_widgets ...")
    try:
        params = {
            "page_type": "listing",
            "q": "milk",
            "lat": "26.9124",
            "lon": "75.7873",
        }
        r = await client.get(f"{base}/v1/layout/listing_widgets", headers=headers, params=params, timeout=15)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 2: v2 search
    print("\n[2] Testing /v2/search ...")
    try:
        params = {"q": "milk", "lat": "26.9124", "lon": "75.7873"}
        r = await client.get(f"{base}/v2/search", headers=headers, params=params, timeout=15)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 3: v1 search
    print("\n[3] Testing /v1/search ...")
    try:
        params = {"q": "milk", "lat": "26.9124", "lon": "75.7873"}
        r = await client.get(f"{base}/v1/search", headers=headers, params=params, timeout=15)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 4: v6 listing (old)
    print("\n[4] Testing /v6/listing/products (old) ...")
    try:
        params = {"search": "milk", "lat": "26.9124", "lon": "75.7873", "page": "1"}
        r = await client.get(f"{base}/v6/listing/products", headers=headers, params=params, timeout=15)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")

    # Test 5: v3 search
    print("\n[5] Testing /v3/search ...")
    try:
        params = {"q": "milk", "lat": "26.9124", "lon": "75.7873"}
        r = await client.get(f"{base}/v3/search", headers=headers, params=params, timeout=15)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_zepto(client: httpx.AsyncClient):
    print("\n" + "="*50)
    print("ZEPTO TESTS")
    print("="*50)
    
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "en-IN,en;q=0.9",
        "Origin": "https://www.zeptonow.com",
        "Referer": "https://www.zeptonow.com/",
        "Content-Type": "application/json",
    }
    
    # Test 1: www subdomain search
    print("\n[1] Testing www.zeptonow.com/api/v3/search ...")
    try:
        payload = {
            "query": "milk",
            "pageNumber": 0,
            "pageSize": 20,
            "intent": False,
            "isRecommendation": False,
        }
        r = await client.post(
            "https://www.zeptonow.com/api/v3/search",
            json=payload,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 2: api subdomain
    print("\n[2] Testing api.zeptonow.com/api/v3/search ...")
    try:
        payload = {
            "query": "milk",
            "pageNumber": 0,
            "pageSize": 20,
        }
        r = await client.post(
            "https://api.zeptonow.com/api/v3/search",
            json=payload,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 3: v2 search
    print("\n[3] Testing www.zeptonow.com/api/v2/search ...")
    try:
        payload = {"query": "milk", "pageNumber": 0, "pageSize": 20}
        r = await client.post(
            "https://www.zeptonow.com/api/v2/search",
            json=payload,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 4: GET search
    print("\n[4] Testing www.zeptonow.com/api/v1/search (GET) ...")
    try:
        r = await client.get(
            "https://www.zeptonow.com/api/v1/search",
            params={"q": "milk"},
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_bigbasket(client: httpx.AsyncClient):
    print("\n" + "="*50)
    print("BIGBASKET TESTS")
    print("="*50)
    
    # First get cookies from homepage
    print("\n[0] Getting cookies from homepage ...")
    cookies = {}
    try:
        r = await client.get("https://www.bigbasket.com/", timeout=15)
        print(f"  Status: {r.status_code}")
        cookies = dict(r.cookies)
        print(f"  Cookies: {list(cookies.keys())}")
        # Extract nhid
        nhid = cookies.get("nhid", "7427")
        print(f"  nhid: {nhid}")
    except Exception as e:
        print(f"  Error: {e}")
        nhid = "7427"
    
    headers = {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.bigbasket.com/",
        "Origin": "https://www.bigbasket.com",
        "x-channel": "BB-WEB",
        "Cookie": f"nhid={nhid}",
    }
    
    # Test 1: listing-svc with nhid
    print(f"\n[1] Testing listing-svc with nhid={nhid} ...")
    try:
        params = {
            "type": "search",
            "slug": "milk",
            "nhid": nhid,
        }
        r = await client.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 2: search with lat/lon
    print("\n[2] Testing listing-svc with lat/lon ...")
    try:
        params = {
            "type": "search",
            "slug": "milk",
            "lat": "26.9124",
            "lng": "75.7873",
        }
        r = await client.get(
            "https://www.bigbasket.com/listing-svc/v2/products",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 3: BB Now API
    print("\n[3] Testing BB Now search API ...")
    try:
        params = {"q": "milk", "nc": "as"}
        r = await client.get(
            "https://www.bigbasket.com/product/get-products/",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 4: catalog search
    print("\n[4] Testing catalog search ...")
    try:
        params = {"q": "milk", "nc": "as"}
        r = await client.get(
            "https://www.bigbasket.com/catalog/search/",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 200): {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_instamart(client: httpx.AsyncClient):
    print("\n" + "="*50)
    print("INSTAMART TESTS")
    print("="*50)
    
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.swiggy.com/instamart",
        "Origin": "https://www.swiggy.com",
    }
    
    # Test 1: instamart search
    print("\n[1] Testing /api/instamart/search ...")
    try:
        params = {
            "pageNumber": "0",
            "searchResultsOffset": "0",
            "limit": "20",
            "query": "milk",
            "ageConsent": "false",
            "layoutId": "2",
            "pageType": "INSTAMART_SEARCH_PAGE",
            "isPreSearchTag": "false",
            "highConfidencePageNumber": "0",
            "lowConfidencePageNumber": "0",
        }
        r = await client.get(
            "https://www.swiggy.com/api/instamart/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Content-Type: {ct}")
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 2: mapi search
    print("\n[2] Testing /mapi/instamart/search ...")
    try:
        params = {"query": "milk", "pageNumber": "0", "limit": "20"}
        r = await client.get(
            "https://www.swiggy.com/mapi/instamart/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Content-Type: {ct}")
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 3: v1 search
    print("\n[3] Testing /api/v1/instamart/search ...")
    try:
        params = {"query": "milk", "pageNumber": "0"}
        r = await client.get(
            "https://www.swiggy.com/api/v1/instamart/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Content-Type: {ct}")
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 4: Swiggy grocery search
    print("\n[4] Testing Swiggy grocery search ...")
    try:
        params = {"query": "milk", "lat": "26.9124", "lng": "75.7873"}
        r = await client.get(
            "https://www.swiggy.com/dapi/instamart/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Content-Type: {ct}")
            print(f"  Body: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_jiomart(client: httpx.AsyncClient):
    print("\n" + "="*50)
    print("JIOMART TESTS")
    print("="*50)
    
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.jiomart.com/",
        "Origin": "https://www.jiomart.com",
    }
    
    # Test 1: catalog search
    print("\n[1] Testing catalog/search ...")
    try:
        params = {"q": "milk", "start": "0", "count": "20"}
        r = await client.get(
            "https://www.jiomart.com/catalog/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 300): {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 2: v2 search
    print("\n[2] Testing v2/catalog/search ...")
    try:
        params = {"q": "milk", "start": "0", "count": "20"}
        r = await client.get(
            "https://www.jiomart.com/v2/catalog/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 300): {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 3: API endpoint
    print("\n[3] Testing api.jiomart.com search ...")
    try:
        params = {"q": "milk"}
        r = await client.get(
            "https://api.jiomart.com/catalog/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 300): {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 4: JioMart Express search
    print("\n[4] Testing JioMart Express search ...")
    try:
        payload = {"query": "milk", "pageNumber": 1, "pageSize": 20}
        r = await client.post(
            "https://www.jiomart.com/api/search",
            json=payload,
            headers={**headers, "Content-Type": "application/json"},
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 300): {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")


async def test_flipkart(client: httpx.AsyncClient):
    print("\n" + "="*50)
    print("FLIPKART MINUTES TESTS")
    print("="*50)
    
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://www.flipkart.com/",
        "Origin": "https://www.flipkart.com",
    }
    
    # Test 1: Flipkart search API
    print("\n[1] Testing Flipkart search API ...")
    try:
        params = {"q": "milk", "otracker": "search", "as": "on"}
        r = await client.get(
            "https://www.flipkart.com/search",
            params=params,
            headers=headers,
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 200): {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Test 2: Flipkart Minutes API
    print("\n[2] Testing Flipkart Minutes API ...")
    try:
        params = {"q": "milk", "lat": "26.9124", "lon": "75.7873"}
        r = await client.get(
            "https://www.flipkart.com/api/4/page/fetch",
            params=params,
            headers={**headers, "X-User-Agent": "Mozilla/5.0 FKUA/website/42/website/Desktop"},
            timeout=15
        )
        print(f"  Status: {r.status_code}")
        ct = r.headers.get("content-type", "")
        print(f"  Content-Type: {ct}")
        if "json" in ct and r.status_code == 200:
            data = r.json()
            print(f"  Keys: {list(data.keys())[:5]}")
            print("  ✅ WORKS!")
        else:
            print(f"  Body (first 200): {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")


async def main():
    print("🔍 Testing all platform APIs...")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,
        timeout=20,
    ) as client:
        await test_blinkit(client)
        await asyncio.sleep(2)
        await test_zepto(client)
        await asyncio.sleep(2)
        await test_bigbasket(client)
        await asyncio.sleep(2)
        await test_instamart(client)
        await asyncio.sleep(2)
        await test_jiomart(client)
        await asyncio.sleep(2)
        await test_flipkart(client)
    
    print("\n" + "="*50)
    print("✅ All tests complete!")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
