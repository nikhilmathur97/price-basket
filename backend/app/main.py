"""
FastAPI application entry point.
Registers routers, middleware, event handlers, and health endpoints.
"""
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.cache.redis_client import close_redis, init_redis
from app.config import settings
from app.database import engine, Base
from app.middleware.rate_limiter import RateLimitMiddleware
from app.api.v1 import auth, products, cart, prices, users, admin, websocket, analytics, setup

log = structlog.get_logger(__name__)


# ── Sentry (production only) ─────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
    )


# ── Lifespan: startup / shutdown ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("Starting Price Basket API", version=settings.APP_VERSION, env=settings.APP_ENV)

    # Create DB tables (in production use Alembic migrations)
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    await init_redis()

    yield

    await close_redis()
    await engine.dispose()
    log.info("Price Basket API shut down cleanly")


# ── App factory ───────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title="Price Basket API",
        description=(
            "Real-time price comparison across Blinkit, Zepto, BigBasket & Swiggy Instamart. "
            "Aggregates product prices, optimizes cart cost/delivery, and notifies users of deals."
        ),
        version=settings.APP_VERSION,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware stack (order matters) ─────────────────────────────────────
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)

    # ── Prometheus metrics ────────────────────────────────────────────────────
    if settings.PROMETHEUS_ENABLED:
        Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # ── Request ID + latency logging ──────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        log.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            latency_ms=round(elapsed, 2),
        )
        response.headers["X-Response-Time"] = f"{elapsed:.2f}ms"
        return response

    # ── API routers ───────────────────────────────────────────────────────────
    PREFIX = "/api/v1"
    app.include_router(auth.router,     prefix=f"{PREFIX}/auth",     tags=["Auth"])
    app.include_router(users.router,    prefix=f"{PREFIX}/users",    tags=["Users"])
    app.include_router(products.router, prefix=f"{PREFIX}/products", tags=["Products"])
    app.include_router(prices.router,   prefix=f"{PREFIX}/prices",   tags=["Prices"])
    app.include_router(cart.router,     prefix=f"{PREFIX}/cart",     tags=["Cart"])
    app.include_router(admin.router,    prefix=f"{PREFIX}/admin",    tags=["Admin"])
    app.include_router(analytics.router, prefix=f"{PREFIX}/analytics", tags=["Analytics"])
    app.include_router(setup.router,     prefix=f"{PREFIX}/setup",     tags=["Setup"])
    app.include_router(websocket.router, prefix="/ws",               tags=["WebSocket"])

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}

    # ── Global exception handler ─────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        log.error("unhandled_exception", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected error occurred. Please try again later."},
        )

    return app


app = create_app()
