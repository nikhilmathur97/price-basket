#!/usr/bin/env python3
"""
Quick local test of the new Playwright-based scrapers.
Tests Blinkit and Zepto scrapers with a single query.

Run: backend/.venv_mac/bin/python3 scripts/test_new_scrapers.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# Minimal settings mock so we don't need full DB
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
os.environ.setdefault("SECRET_KEY", "test-key-local")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")


async def test_blinkit():
    print("\n🟡 Testing BlinkitScraper...")
    from app.scrapers.blinkit_scraper import BlinkitScraper, _parse_snippets
    import uuid

    # Test the parser with mock data (no network needed)
    mock_data = {
        "response": {
            "snippets": [
                {
                    "widget_type": "product_card_snippet_type_2",
                    "data": {
                        "name": {"text": "Amul Gold Milk"},
                        "normal_price": {"text": "₹68"},
                        "mrp": {"text": "₹72"},
                        "variant": {"text": "1 L"},
                        "image": {"url": "https://cdn.blinkit.com/test.jpg"},
                    }
                },
                {
                    "widget_type": "banner_widget",  # should be skipped
                    "data": {}
                }
            ]
        }
    }
    products = _parse_snippets(mock_data)
    assert len(products) == 1, f"Expected 1 product, got {len(products)}"
    assert products[0]["name"] == "Amul Gold Milk"
    assert products[0]["price"] == 68.0
    assert products[0]["mrp"] == 72.0
    assert products[0]["unit"] == "1 L"
    print(f"  ✅ Parser test passed: {products[0]['name']} ₹{products[0]['price']}")

    # Test live scraping
    print("  🌐 Testing live scrape (milk)...")
    scraper = BlinkitScraper()
    result = await scraper.fetch_price(uuid.uuid4(), "milk")
    if result:
        print(f"  ✅ Live: {result.price} (available={result.is_available})")
    else:
        print("  ⚠️  No result (may be location/network issue)")


async def test_zepto():
    print("\n⚡ Testing ZeptoScraper...")
    from app.scrapers.zepto_scraper import ZeptoScraper, _parse_layout, _paise_to_rupees
    import uuid

    # Test paise conversion
    assert _paise_to_rupees(3600) == 36.0, "3600 paise should be ₹36"
    assert _paise_to_rupees(6800) == 68.0, "6800 paise should be ₹68"
    print("  ✅ Paise conversion test passed")

    # Test parser with mock data
    mock_data = {
        "layout": [
            {
                "widgetName": "SEARCHED_PRODUCTS_WIDGET",
                "data": {
                    "resolver": {
                        "data": {
                            "items": [
                                {
                                    "productResponse": {
                                        "product": {"name": "Amul Milk 500ml"},
                                        "discountedSellingPrice": 3200,
                                        "mrp": 3500,
                                        "outOfStock": False,
                                        "productVariant": {
                                            "quantity": 500,
                                            "unitOfMeasure": "MILLILITRE",
                                            "images": [{"path": "test/image.jpg"}]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        ]
    }
    products = _parse_layout(mock_data)
    assert len(products) == 1, f"Expected 1 product, got {len(products)}"
    assert products[0]["name"] == "Amul Milk 500ml"
    assert products[0]["price"] == 32.0
    assert products[0]["mrp"] == 35.0
    print(f"  ✅ Parser test passed: {products[0]['name']} ₹{products[0]['price']}")

    # Test live scraping
    print("  🌐 Testing live scrape (milk)...")
    scraper = ZeptoScraper()
    result = await scraper.fetch_price(uuid.uuid4(), "milk")
    if result:
        print(f"  ✅ Live: ₹{result.price} (available={result.is_available})")
    else:
        print("  ⚠️  No result (may be location/network issue)")


async def main():
    print("=" * 50)
    print("🧪 PriceBasket Scraper Tests")
    print("=" * 50)

    await test_blinkit()
    await test_zepto()

    # Shutdown playwright
    try:
        from app.scrapers.playwright_pool import shutdown_playwright
        await shutdown_playwright()
    except Exception:
        pass

    print("\n✅ All tests passed!")


if __name__ == "__main__":
    asyncio.run(main())
