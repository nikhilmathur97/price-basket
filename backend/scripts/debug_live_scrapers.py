"""
Deep diagnostic: open each platform, take screenshot, dump page title + first 3000 chars of HTML,
and log all JSON responses captured.
Run: .venv_mac2/bin/python scripts/debug_live_scrapers.py
"""
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from urllib.parse import quote_plus

QUERY = "Amul Butter 500g"


async def debug_bigbasket():
    from app.scrapers.playwright_pool import get_browser, new_stealth_context
    print("\n" + "=" * 60)
    print("BIGBASKET DEBUG")
    print("=" * 60)

    captured = []

    async with get_browser() as browser:
        context = await new_stealth_context(browser, platform="bigbasket",
                                             viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        async def on_resp(r):
            url = r.url
            if "bigbasket.com" not in url:
                return
            ct = r.headers.get("content-type", "")
            if "json" in ct and r.status == 200:
                try:
                    d = await r.json()
                    captured.append({"url": url, "data": d})
                    print(f"  [JSON] {url[:100]} → keys={list(d.keys())[:6] if isinstance(d, dict) else type(d).__name__}")
                except Exception:
                    pass

        page.on("response", on_resp)

        print("→ Navigating to bigbasket.com ...")
        await page.goto("https://www.bigbasket.com", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)
        title = await page.title()
        print(f"  Homepage title: {title!r}")

        print(f"→ Navigating to search: {QUERY}")
        await page.goto(
            f"https://www.bigbasket.com/ps/?q={quote_plus(QUERY)}&nc=as",
            wait_until="networkidle", timeout=30000
        )
        await asyncio.sleep(3)
        title = await page.title()
        print(f"  Search title: {title!r}")

        html = await page.content()
        print(f"  HTML length: {len(html)}")
        print(f"  HTML snippet: {html[:500]!r}")

        # Check for product cards
        card_count = await page.evaluate("""() => {
            const selectors = ['[class*="SKUDeck"]', '[class*="product-card"]', '[data-product-id]',
                               '[class*="ProductCard"]', 'li[class*="product"]'];
            for (const s of selectors) {
                const n = document.querySelectorAll(s).length;
                if (n > 0) return {selector: s, count: n};
            }
            return {selector: 'none', count: 0};
        }""")
        print(f"  Product cards: {card_count}")

        # Try listing-svc API directly
        print("→ Trying listing-svc API from browser ...")
        result = await page.evaluate("""async (q) => {
            try {
                const r = await fetch(
                    '/listing-svc/v2/products?slug=' + encodeURIComponent(q)
                    + '&page=1&tab=prd&listingPageType=srch&type=search',
                    {headers: {Accept: 'application/json, text/plain, */*', 'x-channel': 'BB-WEB'}}
                );
                const text = await r.text();
                return {status: r.status, text: text.substring(0, 500)};
            } catch(e) { return {error: String(e)}; }
        }""", QUERY)
        print(f"  listing-svc result: {result}")

        # Try get-products API
        result2 = await page.evaluate("""async (q) => {
            try {
                const r = await fetch(
                    '/product/get-products/?q=' + encodeURIComponent(q) + '&nc=as',
                    {headers: {Accept: 'application/json, text/plain, */*'}}
                );
                const text = await r.text();
                return {status: r.status, text: text.substring(0, 500)};
            } catch(e) { return {error: String(e)}; }
        }""", QUERY)
        print(f"  get-products result: {result2}")

        await page.screenshot(path="/tmp/bb_debug.png")
        print("  Screenshot saved: /tmp/bb_debug.png")
        await context.close()

    print(f"\n  Total JSON responses captured: {len(captured)}")
    for c in captured[:3]:
        print(f"    URL: {c['url'][:80]}")
        d = c['data']
        if isinstance(d, dict):
            print(f"    Keys: {list(d.keys())[:8]}")


async def debug_instamart():
    from app.scrapers.playwright_pool import get_browser, new_stealth_context
    print("\n" + "=" * 60)
    print("INSTAMART DEBUG")
    print("=" * 60)

    captured = []

    async with get_browser() as browser:
        context = await new_stealth_context(browser, platform="instamart",
                                             viewport={"width": 390, "height": 844},
                                             user_agent=(
                                                 "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                                                 "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                                                 "Version/17.0 Mobile/15E148 Safari/604.1"
                                             ))
        page = await context.new_page()

        async def on_resp(r):
            url = r.url
            if "swiggy.com" not in url:
                return
            ct = r.headers.get("content-type", "")
            if "json" in ct and r.status == 200:
                try:
                    d = await r.json()
                    captured.append({"url": url, "data": d})
                    print(f"  [JSON] {url[:100]} → keys={list(d.keys())[:6] if isinstance(d, dict) else type(d).__name__}")
                except Exception:
                    pass

        page.on("response", on_resp)

        print("→ Navigating to swiggy.com/instamart ...")
        await page.goto("https://www.swiggy.com/instamart", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        title = await page.title()
        print(f"  Homepage title: {title!r}")

        print(f"→ Navigating to search: {QUERY}")
        await page.goto(
            f"https://www.swiggy.com/instamart/search?query={quote_plus(QUERY)}",
            wait_until="networkidle", timeout=35000
        )
        await asyncio.sleep(4)
        title = await page.title()
        print(f"  Search title: {title!r}")

        html = await page.content()
        print(f"  HTML length: {len(html)}")
        print(f"  HTML snippet: {html[:300]!r}")

        # Try POST search API
        result = await page.evaluate("""async (q) => {
            try {
                let storeId = '';
                try {
                    const state = window.__INITIAL_STATE__ || window.__REDUX_STATE__ || {};
                    storeId = state?.instamart?.storeId || state?.storeId || '';
                } catch(e) {}
                console.log('storeId:', storeId);
                const r = await fetch(
                    '/api/instamart/search/v2?offset=0&ageConsent=false&storeId=' + storeId,
                    {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            facets: [], sortAttribute: '', query: q,
                            search_results_offset: '0',
                            page_type: 'INSTAMART_SEARCH_PAGE',
                            is_pre_search_tag: false
                        })
                    }
                );
                const text = await r.text();
                return {status: r.status, text: text.substring(0, 800)};
            } catch(e) { return {error: String(e)}; }
        }""", QUERY)
        print(f"  POST search result: {result}")

        await page.screenshot(path="/tmp/instamart_debug.png")
        print("  Screenshot saved: /tmp/instamart_debug.png")
        await context.close()

    print(f"\n  Total JSON responses captured: {len(captured)}")
    for c in captured[:5]:
        print(f"    URL: {c['url'][:80]}")
        d = c['data']
        if isinstance(d, dict):
            print(f"    Keys: {list(d.keys())[:8]}")


async def debug_jiomart():
    from app.scrapers.playwright_pool import get_browser, new_stealth_context
    print("\n" + "=" * 60)
    print("JIOMART DEBUG")
    print("=" * 60)

    captured = []

    async with get_browser() as browser:
        context = await new_stealth_context(browser, platform="jiomart",
                                             viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        async def on_resp(r):
            url = r.url
            if "jiomart.com" not in url:
                return
            ct = r.headers.get("content-type", "")
            if r.status == 200:
                print(f"  [RESP {r.status}] {url[:100]} ct={ct[:30]}")
            if "json" in ct and r.status == 200:
                try:
                    d = await r.json()
                    captured.append({"url": url, "data": d})
                    print(f"    → JSON keys={list(d.keys())[:6] if isinstance(d, dict) else type(d).__name__}")
                except Exception:
                    pass

        page.on("response", on_resp)

        print("→ Navigating to jiomart.com ...")
        await page.goto("https://www.jiomart.com", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(2)
        title = await page.title()
        print(f"  Homepage title: {title!r}")

        print(f"→ Navigating to search: {QUERY}")
        await page.goto(
            f"https://www.jiomart.com/search#{quote_plus(QUERY)}",
            wait_until="networkidle", timeout=35000
        )
        await asyncio.sleep(4)
        title = await page.title()
        print(f"  Search title: {title!r}")

        html = await page.content()
        print(f"  HTML length: {len(html)}")
        print(f"  HTML snippet: {html[:400]!r}")

        # Check product cards
        card_count = await page.evaluate("""() => {
            const selectors = ['[class*="sku-card"]', '[class*="product-item"]',
                               '[id*="product_"]', '.product-card', '[data-product-id]'];
            for (const s of selectors) {
                const n = document.querySelectorAll(s).length;
                if (n > 0) return {selector: s, count: n};
            }
            // Count all li elements
            return {selector: 'li', count: document.querySelectorAll('li').length};
        }""")
        print(f"  Product cards: {card_count}")

        # Try API endpoints
        result = await page.evaluate("""async (q) => {
            const endpoints = [
                '/ext/vertex/application/api/v1.0/deliverable/products?page_size=12&q=' + encodeURIComponent(q),
                '/catalog/product/get_json_data?q=' + encodeURIComponent(q) + '&page_no=1&page_size=5&sort_by=relevance&channel=web',
                '/api/v1/products/search?q=' + encodeURIComponent(q),
            ];
            const results = [];
            for (const url of endpoints) {
                try {
                    const r = await fetch(url, {headers: {Accept: 'application/json'}});
                    const text = await r.text();
                    results.push({url: url.substring(0, 60), status: r.status, text: text.substring(0, 300)});
                } catch(e) {
                    results.push({url: url.substring(0, 60), error: String(e)});
                }
            }
            return results;
        }""", QUERY)
        print(f"  API results: {json.dumps(result, indent=2)[:1000]}")

        await page.screenshot(path="/tmp/jiomart_debug.png")
        print("  Screenshot saved: /tmp/jiomart_debug.png")
        await context.close()

    print(f"\n  Total JSON responses captured: {len(captured)}")
    for c in captured[:5]:
        print(f"    URL: {c['url'][:80]}")
        d = c['data']
        if isinstance(d, dict):
            print(f"    Keys: {list(d.keys())[:8]}")


async def main():
    await debug_bigbasket()
    await debug_instamart()
    await debug_jiomart()


if __name__ == "__main__":
    asyncio.run(main())
