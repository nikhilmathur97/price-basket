"""
Sliding-window rate limiter using Redis.
Limits are applied per (IP, endpoint) key.
When Redis is unavailable the middleware fails-open (all requests pass through).
"""
import time
from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.cache.redis_client import get_redis

# endpoint_pattern → (max_requests, window_seconds)
RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/v1/auth/login":    (10,  60),
    "/api/v1/auth/register": (5,   60),
    "/api/v1/auth/refresh":  (20,  60),
    "default":               (300, 60),
}


def _get_limit(path: str) -> tuple[int, int]:
    for pattern, limit in RATE_LIMITS.items():
        if pattern != "default" and path.startswith(pattern):
            return limit
    return RATE_LIMITS["default"]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip health / metrics endpoints
        if request.url.path in {"/health", "/metrics"}:
            return await call_next(request)

        redis = await get_redis()
        # Fail-open: if Redis is not available skip rate limiting entirely
        if redis is None:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        max_requests, window = _get_limit(request.url.path)
        key = f"rl:{client_ip}:{request.url.path}"

        now = int(time.time())
        window_start = now - window

        try:
            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            request_count = results[2]
        except Exception:
            # Redis error mid-request — fail-open
            return await call_next(request)

        if request_count > max_requests:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - request_count))
        return response

        return response
