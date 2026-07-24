#!/usr/bin/env python3
"""
Flush all Redis cache keys related to featured products and individual product
entries so the image-promotion fix in _enrich() takes effect immediately
without waiting for the 5-minute TTL to expire.

Usage (from repo root):
    cd backend && python ../scripts/flush_featured_cache.py

Requires REDIS_URL to be set in the environment (or a .env file).
"""
import asyncio
import os
import sys

# Allow running from repo root without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


async def flush():
    try:
        from redis.asyncio import from_url as redis_from_url
    except ImportError:
        print("ERROR: redis package not installed. Run: pip install redis")
        sys.exit(1)

    client = redis_from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    try:
        await client.ping()
    except Exception as e:
        print(f"ERROR: Cannot connect to Redis at {REDIS_URL}: {e}")
        await client.aclose()
        sys.exit(1)

    patterns = [
        "featured:v2:*",   # old featured cache (pre-image-promotion fix)
        "featured:v3:*",   # new featured cache key
        "product:v1:*",    # old individual product cache entries
        "product:v2:*",    # new individual product cache entries
        "search:v1:*",     # old search result cache
        "search:v2:*",     # new search result cache
    ]

    total = 0
    for pattern in patterns:
        count = 0
        async for key in client.scan_iter(pattern):
            await client.delete(key)
            count += 1
        print(f"  Flushed {count:>5} keys matching '{pattern}'")
        total += count

    await client.aclose()
    print(f"\n✅ Total flushed: {total} keys from {REDIS_URL}")
    print("   Next request to /products/featured will rebuild with promoted images.")


if __name__ == "__main__":
    print(f"Flushing product image caches from Redis ({REDIS_URL}) …\n")
    asyncio.run(flush())
