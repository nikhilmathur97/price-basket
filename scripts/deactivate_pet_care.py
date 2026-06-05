#!/usr/bin/env python3
"""
One-shot migration: deactivate the 'pet-care' category in the live database.

Run once on production:
    python scripts/deactivate_pet_care.py

The categories API (products.py:132) filters Category.is_active == True,
so setting is_active=False immediately removes Pet Care from the home page
category grid on both web and the Flutter app without a redeploy.

The Redis cache key 'categories:all' is also cleared so the change is
visible on the next request (no 1-hour cache wait).
"""

import asyncio
import os
import sys

# ── Allow running from repo root ──────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ── Import the model ──────────────────────────────────────────────────────────
try:
    from backend.app.models import Category
    from backend.app.core.config import settings
    DATABASE_URL = settings.DATABASE_URL
except ImportError:
    # Fallback: read DATABASE_URL directly from environment
    DATABASE_URL = os.environ.get("DATABASE_URL", "")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable not set.")
        sys.exit(1)
    # Convert postgres:// → postgresql+asyncpg://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

    from backend.app.models import Category


async def main() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            update(Category)
            .where(Category.slug == "pet-care")
            .values(is_active=False)
            .returning(Category.id, Category.name, Category.is_active)
        )
        rows = result.fetchall()
        await session.commit()

    if rows:
        for row in rows:
            print(f"✅  Updated category id={row[0]} name='{row[1]}' is_active={row[2]}")
    else:
        print("⚠️  No category with slug='pet-care' found — nothing updated.")

    # ── Clear Redis cache so the change is visible immediately ────────────────
    try:
        import redis.asyncio as aioredis
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        r = aioredis.from_url(redis_url)
        deleted = await r.delete("categories:all")
        await r.aclose()
        print(f"🗑️  Redis cache key 'categories:all' {'cleared' if deleted else 'was already empty'}.")
    except Exception as e:
        print(f"ℹ️  Redis cache clear skipped ({e}). Cache will expire naturally.")

    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
