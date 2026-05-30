#!/bin/bash
# Startup script: run DB migrations then start the server.
# Handles the case where tables were already created (e.g. via create_all)
# by stamping alembic head before running upgrade.

set -e

echo "==> Running DB migrations..."

# Check whether alembic_version table exists.
# If it does but is empty (tables created via create_all), stamp head first.
python3 - <<'PYEOF'
import asyncio, os, sys

async def stamp_if_needed():
    import re
    raw_url = os.environ.get("DATABASE_URL", "")
    url = re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", raw_url)

    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            # Check if alembic_version table exists
            r = await conn.execute(text("SELECT to_regclass('public.alembic_version')"))
            tbl = r.scalar()
            if tbl is not None:
                # Table exists — check if it has any rows
                r2 = await conn.execute(text("SELECT COUNT(*) FROM alembic_version"))
                count = r2.scalar()
                if count == 0:
                    print("Tables exist but alembic_version is empty — stamping head")
                    sys.exit(2)   # signal: need stamp
                else:
                    print("alembic_version already populated — running upgrade normally")
                    sys.exit(0)
            else:
                print("No alembic_version table — running upgrade from scratch")
                sys.exit(0)
    finally:
        await engine.dispose()

asyncio.run(stamp_if_needed())
PYEOF

EXIT=$?
if [ "$EXIT" -eq 2 ]; then
    echo "==> Stamping alembic head (tables already exist)..."
    alembic stamp head
fi

echo "==> Running alembic upgrade head..."
alembic upgrade head

# ── Auto-submit sitemap to Google & Bing on every deploy ──────────────────────
echo "==> Pinging search engines with sitemap..."
python3 - <<'PINGEOF'
import os, urllib.request, urllib.error

SITE_URL = os.environ.get("SITE_URL", "https://pricebasket.in")
SITEMAP  = f"{SITE_URL}/sitemap.xml"

PING_URLS = [
    # Google — sitemap ping
    f"https://www.google.com/ping?sitemap={SITEMAP}",
    # Bing — sitemap ping
    f"https://www.bing.com/ping?sitemap={SITEMAP}",
]

for url in PING_URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PriceBasket-Deploy/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"  ✓ Pinged {url.split('?')[0]} → HTTP {r.status}")
    except Exception as e:
        # Non-fatal — never block startup
        print(f"  ⚠ Sitemap ping failed (non-fatal): {e}")

# IndexNow ping for all key pages
INDEXNOW_KEY = os.environ.get("INDEXNOW_KEY", "")
if INDEXNOW_KEY:
    import json
    KEY_LOCATION = f"{SITE_URL}/indexnow"
    URLS_TO_INDEX = [
        SITE_URL,
        f"{SITE_URL}/best-grocery-deals",
        f"{SITE_URL}/save-money-groceries",
        f"{SITE_URL}/compare/blinkit-vs-zepto",
        f"{SITE_URL}/compare/zepto-vs-instamart",
        f"{SITE_URL}/compare/blinkit-vs-bigbasket",
        f"{SITE_URL}/compare/zepto-vs-bigbasket",
        f"{SITE_URL}/compare/bigbasket-vs-jiomart",
        f"{SITE_URL}/blog",
    ]
    payload = json.dumps({
        "host": SITE_URL.replace("https://", "").replace("http://", ""),
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": URLS_TO_INDEX,
    }).encode()
    try:
        req = urllib.request.Request(
            "https://api.indexnow.org/indexnow",
            data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"  ✓ IndexNow submitted {len(URLS_TO_INDEX)} URLs → HTTP {r.status}")
    except Exception as e:
        print(f"  ⚠ IndexNow ping failed (non-fatal): {e}")
else:
    print("  ℹ INDEXNOW_KEY not set — skipping IndexNow ping")
PINGEOF

echo "==> Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
