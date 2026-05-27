#!/bin/bash
# Startup script: run DB migrations then start the server.
# Handles the case where tables were already created (e.g. via create_all)
# by stamping alembic head before running upgrade.

set -e

# Install Playwright Chromium browser if not already present
echo "==> Installing Playwright Chromium browser..."
python3 -m playwright install chromium --with-deps 2>/dev/null || \
    python3 -m playwright install chromium 2>/dev/null || \
    echo "WARNING: Playwright install failed — scrapers will fall back gracefully"

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

echo "==> Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
