"""Redis connection pool shared across the application.

Graceful fallback: if Redis is unavailable in development the app still starts
and cache helpers become no-ops (cache misses force fresh fetches every time).
"""
import logging
from typing import Optional

from redis.asyncio import Redis
from redis.asyncio import from_url as redis_from_url
from redis.exceptions import RedisError

from app.config import settings

log = logging.getLogger(__name__)

_redis: Optional[Redis] = None


async def init_redis() -> None:
    global _redis
    try:
        client = redis_from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
        await client.ping()
        _redis = client
        log.info("Redis connected at %s", settings.REDIS_URL)
    except Exception as exc:
        log.warning(
            "Redis unavailable (%s). Caching disabled — prices will be fetched live on every request.",
            exc,
        )
        _redis = None


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


def is_redis_available() -> bool:
    return _redis is not None


async def get_redis() -> Optional[Redis]:
    """Return the Redis client or None when Redis is not available."""
    return _redis


# ── Convenience helpers (all are no-ops when Redis is unavailable) ─────────────

async def cache_get(key: str) -> Optional[str]:
    if _redis is None:
        return None
    try:
        return await _redis.get(key)
    except RedisError:
        return None


async def cache_set(key: str, value: str, ttl: int = settings.REDIS_CACHE_TTL) -> None:
    if _redis is None:
        return
    try:
        await _redis.set(key, value, ex=ttl)
    except RedisError:
        pass


async def cache_delete(key: str) -> None:
    if _redis is None:
        return
    try:
        await _redis.delete(key)
    except RedisError:
        pass


async def cache_delete_pattern(pattern: str) -> None:
    if _redis is None:
        return
    try:
        async for key in _redis.scan_iter(pattern):
            await _redis.delete(key)
    except RedisError:
        pass
