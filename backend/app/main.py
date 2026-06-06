"""
FastAPI application entry point.
Registers routers, middleware, event handlers, and health endpoints.
"""
import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import func, select, update

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.cache.redis_client import close_redis, init_redis, cache_get, cache_set
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.middleware.rate_limiter import RateLimitMiddleware
from app.api.v1 import auth, products, cart, prices, users, admin, websocket, analytics, setup, content, growth, app_meta
from app.models.product import Product

log = structlog.get_logger(__name__)

# ── Self keep-alive: prevents Render free-tier cold starts ────────────────────
_keepalive_task: asyncio.Task | None = None


async def _self_ping_loop() -> None:
    """
    Ping our own /ping endpoint every 10 minutes so Render never idles the
    service. Render free tier sleeps after 15 min of inactivity — this keeps
    it permanently warm at zero cost. Uses httpx (already in requirements).
    """
    import httpx
    await asyncio.sleep(60)  # wait 60 s after startup before first ping
    port = int(os.environ.get("PORT", 8000))
    url = f"http://localhost:{port}/ping"
    while True:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                log.debug("self_ping", status=resp.status_code)
        except Exception as exc:
            log.debug("self_ping_failed", error=str(exc))
        await asyncio.sleep(600)  # every 10 minutes


async def _auto_mark_featured() -> None:
    """If no products have is_featured=True, mark the first 60 active ones so the homepage always shows products."""
    try:
        async with AsyncSessionLocal() as db:
            featured_count = await db.scalar(
                select(func.count()).select_from(Product).where(Product.is_featured.is_(True))
            )
            if featured_count == 0:
                subq = select(Product.id).where(Product.is_active.is_(True)).order_by(Product.created_at.desc()).limit(60).scalar_subquery()
                await db.execute(update(Product).where(Product.id.in_(subq)).values(is_featured=True))
                await db.commit()
                log.info("Auto-marked active products as featured for homepage")
    except Exception:
        log.warning("_auto_mark_featured failed — non-fatal, continuing startup")


async def _warm_featured_cache() -> None:
    """Pre-warm the featured products cache on startup so the first user request is instant."""
    try:
        from app.models.price import PlatformPrice
        from sqlalchemy.orm import selectinload
        cache_key = "featured:v2:60"
        cached = await cache_get(cache_key)
        if cached:
            log.info("featured_cache_already_warm")
            return
        import json
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Product)
                .where(Product.is_active.is_(True), Product.is_featured.is_(True))
                .options(
                    selectinload(Product.category),
                    selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
                )
                .order_by(Product.created_at.desc())
                .limit(60)
            )
            prods = result.scalars().all()
            if prods:
                from app.api.v1.products import _enrich
                enriched = [_enrich(p, p.platform_prices) for p in prods]
                out = [e.model_dump(mode="json") for e in enriched]
                await cache_set(cache_key, json.dumps(out), 300)
                log.info("featured_cache_warmed", count=len(prods))
    except Exception as exc:
        log.warning("warm_featured_cache_failed", error=str(exc))


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
    global _keepalive_task
    log.info("Starting Price Basket API", version=settings.APP_VERSION, env=settings.APP_ENV)

    # Create DB tables (in production use Alembic migrations)
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    await init_redis()
    await _auto_mark_featured()

    # Pre-warm featured products cache so first user request is instant
    asyncio.create_task(_warm_featured_cache())

    # Start self-ping keep-alive loop to prevent Render cold starts
    if settings.is_production:
        _keepalive_task = asyncio.create_task(_self_ping_loop())
        log.info("self_keepalive_started")

    yield

    # Cancel keep-alive loop on shutdown
    if _keepalive_task and not _keepalive_task.done():
        _keepalive_task.cancel()
        try:
            await _keepalive_task
        except asyncio.CancelledError:
            pass

    await close_redis()
    await engine.dispose()
    # Gracefully shut down the shared Playwright browser (if it was used)
    try:
        from app.scrapers.playwright_pool import shutdown_playwright
        await shutdown_playwright()
    except Exception:
        pass
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
    # Merge env-configured origins with hardcoded production domains so CORS
    # works even if the Render env var is missing or incomplete.
    _BASE_ORIGINS = [
        "https://pricebasket.in",
        "https://www.pricebasket.in",
        "https://dev.pricebasket.in",
        "https://test.pricebasket.in",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4040",
    ]
    _allowed_origins = list(dict.fromkeys(_BASE_ORIGINS + list(settings.ALLOWED_ORIGINS)))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        # Catches all subdomains + Vercel preview URLs
        allow_origin_regex=r"https?://(?:[\w-]+\.)?pricebasket\.in|https?://[\w-]+\.vercel\.app|http://localhost(?::\d+)?",
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
        # Skip noisy keep-alive pings from logs
        if request.url.path in {"/ping", "/health"}:
            return await call_next(request)
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
    app.include_router(content.router,   prefix=f"{PREFIX}/content",   tags=["Content"])
    app.include_router(growth.router,    prefix=f"{PREFIX}/growth",    tags=["Growth"])
    app.include_router(app_meta.router,  prefix=f"{PREFIX}/app",       tags=["App"])
    app.include_router(websocket.router, prefix="/ws",               tags=["WebSocket"])

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
    async def health():
        import os
        content: dict = {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}
        # Include live RAM stats so you can check memory usage from terminal:
        #   curl https://pricebasket-api.onrender.com/health
        try:
            import psutil
            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            vm  = psutil.virtual_memory()
            content["memory"] = {
                "process_rss_mb":  round(mem.rss  / 1024 / 1024, 1),  # this process RSS
                "process_vms_mb":  round(mem.vms  / 1024 / 1024, 1),  # virtual memory
                "system_used_mb":  round(vm.used  / 1024 / 1024, 1),  # total system used
                "system_total_mb": round(vm.total / 1024 / 1024, 1),  # total system RAM
                "system_pct":      round(vm.percent, 1),               # % used
            }
        except Exception:
            pass  # psutil not installed — skip memory stats
        resp = JSONResponse(content=content)
        # Short cache — memory stats should be fresh
        resp.headers["Cache-Control"] = "public, max-age=10, s-maxage=10"
        return resp

    # ── Lightweight ping for keep-alive probes (no logging overhead) ──────────
    @app.get("/ping", tags=["Health"], status_code=status.HTTP_200_OK, include_in_schema=False)
    async def ping():
        return JSONResponse(content={"pong": True}, headers={"Cache-Control": "no-store"})

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
