"""
Product & Search API
====================
- GET /products/         — list/search products with real-time prices
- GET /products/{id}     — single product with full cross-platform comparison
- GET /products/categories — category tree
- GET /products/featured  — homepage featured products
"""
import hashlib
import json
import uuid
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, status
from fastapi.responses import RedirectResponse, Response as FastAPIResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cache.redis_client import cache_get, cache_set
from app.config import settings
from app.database import get_db
from app.middleware.auth_middleware import get_optional_user
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Category, Product
from app.schemas import (
    CoverageSummaryOut,
    CategoryOut,
    PlatformOut,
    PlatformPriceOut,
    ProductOut,
    ProductIntelligenceOut,
    ProductSearchResult,
    ProductWithPrices,
)
from app.services.price_engine import PriceEngine
from app.services.product_intelligence import ProductIntelligenceService

router = APIRouter()
intelligence_service = ProductIntelligenceService()


def _enrich(product: Product, prices: List[PlatformPrice]) -> ProductWithPrices:
    """Attach live prices and compute highlight platforms.

    Includes ALL platform prices (available and unavailable) so the frontend
    can render "Unavailable" badges. cheapest/fastest/best_value are derived
    only from available prices.
    """
    intelligence = intelligence_service.build_snapshot(product, prices)

    # Build price_outs for ALL prices — unavailable ones get is_available=False
    # so the frontend can show "Out of stock" / "Unavailable" badges.
    price_outs = [
        PlatformPriceOut(
            platform=PlatformOut.model_validate(pp.platform),
            price=float(pp.price),
            original_price=float(pp.original_price) if pp.original_price else None,
            discount_percent=pp.discount_percent,
            discount_label=pp.discount_label,
            is_available=pp.is_available,
            delivery_time_minutes=pp.delivery_time_minutes,
            platform_product_url=pp.platform_product_url,
            platform_image_url=pp.platform_image_url if hasattr(pp, "platform_image_url") else None,
            buy_url=intelligence_service.build_buy_url(product.id, pp.platform.id) if pp.platform_product_url else None,
            last_updated=pp.last_updated,
            source=getattr(pp, "source", None),
        )
        for pp in prices
    ]

    # Highlight platforms derived from available prices only
    available_outs = [p for p in price_outs if p.is_available]

    cheapest = min(available_outs, key=lambda p: p.price, default=None) if available_outs else None
    fastest = (
        min(
            [p for p in available_outs if p.delivery_time_minutes],
            key=lambda p: p.delivery_time_minutes,
            default=None,
        )
        if available_outs
        else None
    )

    def bv_score(p: PlatformPriceOut) -> float:
        prices_list = [x.price for x in available_outs]
        min_p, max_p = min(prices_list, default=1), max(prices_list, default=1)
        times = [x.delivery_time_minutes or 60 for x in available_outs]
        min_t, max_t = min(times, default=1), max(times, default=1)
        np_ = (p.price - min_p) / (max_p - min_p + 1e-9)
        nt = ((p.delivery_time_minutes or 60) - min_t) / (max_t - min_t + 1e-9)
        return 0.7 * np_ + 0.3 * nt

    best_value = min(available_outs, key=bv_score, default=None) if available_outs else None
    eta_values = [p.delivery_time_minutes for p in available_outs if p.delivery_time_minutes]

    return ProductWithPrices(
        **ProductOut.model_validate(product).model_dump(),
        platform_prices=price_outs,
        cheapest_platform=cheapest.platform if cheapest else None,
        fastest_platform=fastest.platform if fastest else None,
        best_value_platform=best_value.platform if best_value else None,
        intelligence=ProductIntelligenceOut(
            normalized_name=intelligence.normalized_name,
            normalized_brand=intelligence.normalized_brand,
            quantity_value=intelligence.quantity_value,
            quantity_unit=intelligence.quantity_unit,
            variant_signature=intelligence.variant_signature,
            available_platform_count=intelligence.available_platform_count,
            total_platform_count=intelligence.total_platform_count,
            best_price=intelligence.best_price,
            highest_price=intelligence.highest_price,
            savings_amount=intelligence.savings_amount,
            price_spread_percent=intelligence.price_spread_percent,
            recommendation_reason=intelligence.recommendation_reason,
        ),
        coverage_summary=CoverageSummaryOut(
            available_platform_count=intelligence.available_platform_count,
            total_platform_count=intelligence.total_platform_count,
            best_eta_minutes=min(eta_values) if eta_values else None,
            average_eta_minutes=round(sum(eta_values) / len(eta_values)) if eta_values else None,
            live_offer_count=len(available_outs),
        ),
    )


@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    cache_key = "categories:all"
    cached = await cache_get(cache_key)
    if cached:
        return FastAPIResponse(
            content=cached,
            media_type="application/json",
            headers={"X-Cache": "HIT", "Cache-Control": "public, max-age=300, s-maxage=300"},
        )

    result = await db.execute(
        select(Category)
        .where(Category.is_active == True, Category.parent_id == None)  # noqa: E711
        .order_by(Category.display_order)
    )
    categories = result.scalars().all()
    out = [CategoryOut.model_validate(c).model_dump(mode="json") for c in categories]
    serialised = json.dumps(out)
    await cache_set(cache_key, serialised, 3600)
    return FastAPIResponse(
        content=serialised,
        media_type="application/json",
        headers={"X-Cache": "MISS", "Cache-Control": "public, max-age=300, s-maxage=300"},
    )


@router.get("/sitemap")
async def sitemap_products(
    limit: int = Query(default=50000, le=50000),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight product list for the frontend XML sitemap.

    Returns only id/slug/updated_at for every active product so the
    Next.js sitemap can enumerate all indexable product URLs without
    pulling full price payloads. Cached for 6 hours.
    """
    cache_key = f"sitemap:products:v1:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    result = await db.execute(
        select(Product.id, Product.slug, Product.updated_at)
        .where(Product.is_active == True)  # noqa: E712
        .order_by(Product.updated_at.desc())
        .limit(limit)
    )
    rows = result.all()
    out = [
        {
            "id": str(r.id),
            "slug": r.slug,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]
    await cache_set(cache_key, json.dumps(out), 21600)  # 6h
    return out


@router.get("/featured", response_model=List[ProductWithPrices])
async def featured_products(
    limit: int = Query(default=60, le=100),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"featured:v2:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        # Return raw JSON string directly — avoids double-serialisation overhead
        return FastAPIResponse(
            content=cached,
            media_type="application/json",
            headers={"X-Cache": "HIT", "Cache-Control": "public, max-age=60, s-maxage=60"},
        )

    # Fetch more than needed so we can interleave categories for balanced home page
    fetch_limit = min(limit * 6, 600)
    result = await db.execute(
        select(Product)
        .where(Product.is_active == True, Product.is_featured == True)  # noqa: E712
        .options(
            selectinload(Product.category),
            selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
        )
        .order_by(func.random())
        .limit(fetch_limit)
    )
    all_featured = result.scalars().all()

    # Interleave by category so every category gets representation
    if all_featured:
        from collections import defaultdict
        by_cat: dict = defaultdict(list)
        for p in all_featured:
            cat_slug = p.category.slug if p.category else "other"
            by_cat[cat_slug].append(p)
        # Round-robin across categories
        interleaved: list = []
        cat_lists = list(by_cat.values())
        i = 0
        while len(interleaved) < limit and any(cat_lists):
            idx = i % len(cat_lists)
            if cat_lists[idx]:
                interleaved.append(cat_lists[idx].pop(0))
            i += 1
        products = interleaved[:limit]
    else:
        products = []

    # Fall back to any active products when none are marked featured
    if not products:
        result = await db.execute(
            select(Product)
            .where(Product.is_active == True)  # noqa: E712
            .options(
                selectinload(Product.category),
                selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
            )
            .order_by(func.random())
            .limit(limit)
        )
        products = result.scalars().all()

    enriched = [_enrich(p, p.platform_prices) for p in products]
    out = [e.model_dump(mode="json") for e in enriched]
    serialised = json.dumps(out)
    # Only cache non-empty results — never cache [] so a transient empty DB
    # state doesn't poison the cache for 5 minutes.
    if out:
        await cache_set(cache_key, serialised, 300)
    return FastAPIResponse(
        content=serialised,
        media_type="application/json",
        headers={"X-Cache": "MISS", "Cache-Control": "public, max-age=60, s-maxage=60"},
    )


@router.get("", response_model=ProductSearchResult)
async def search_products(
    q: Optional[str] = Query(default=None, description="Search query"),
    category_slug: Optional[str] = Query(default=None),
    platform_slug: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    sort: str = Query(default="relevance", enum=["relevance", "price_asc", "price_desc", "fastest"]),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    # X-Session-ID header for guest tracking — optional, never blocks the request
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
):
    # Reject explicitly empty query strings (e.g. ?q=) — callers must omit the
    # param entirely or provide at least one character.
    if q is not None and q.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty. Provide at least one character or omit the 'q' parameter.",
        )
    # ── Cache key: hash all query params so identical searches are instant ────
    cache_key = "search:v1:" + hashlib.md5(
        f"{q}|{category_slug}|{platform_slug}|{min_price}|{max_price}|{sort}|{page}|{page_size}".encode()
    ).hexdigest()
    cached = await cache_get(cache_key)
    if cached:
        return FastAPIResponse(
            content=cached,
            media_type="application/json",
            headers={"X-Cache": "HIT"},
        )

    stmt = (
        select(Product)
        .where(Product.is_active == True)  # noqa: E712
        .options(
            selectinload(Product.category),
            selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
        )
    )

    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(like),
                Product.brand.ilike(like),
                Product.description.ilike(like),
            )
        )

    if category_slug:
        stmt = stmt.join(Category, Product.category_id == Category.id).where(
            Category.slug == category_slug
        )

    # Count total — must mirror the same filters as stmt (including category_slug)
    count_stmt = select(func.count(Product.id)).where(Product.is_active == True)  # noqa: E712
    if q:
        count_stmt = count_stmt.where(
            or_(
                Product.name.ilike(f"%{q}%"),
                Product.brand.ilike(f"%{q}%"),
                Product.description.ilike(f"%{q}%"),
            )
        )
    if category_slug:
        count_stmt = count_stmt.join(Category, Product.category_id == Category.id).where(
            Category.slug == category_slug
        )
    total = (await db.execute(count_stmt)).scalar_one()

    # Pagination
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    products = result.scalars().all()

    enriched = [_enrich(p, p.platform_prices) for p in products]

    # Sorting (post-fetch for price/delivery derived fields)
    if sort == "price_asc":
        enriched.sort(
            key=lambda x: min((pp.price for pp in x.platform_prices), default=float("inf"))
        )
    elif sort == "price_desc":
        enriched.sort(
            key=lambda x: min((pp.price for pp in x.platform_prices), default=0),
            reverse=True,
        )
    elif sort == "fastest":
        enriched.sort(
            key=lambda x: min(
                (pp.delivery_time_minutes for pp in x.platform_prices if pp.delivery_time_minutes),
                default=9999,
            )
        )

    out = ProductSearchResult(total=total, page=page, page_size=page_size, items=enriched)
    serialised = out.model_dump_json()
    # Cache search results for 2 minutes (short TTL so price changes propagate)
    await cache_set(cache_key, serialised, 120)
    return FastAPIResponse(content=serialised, media_type="application/json", headers={"X-Cache": "MISS"})


# Register /search as a concrete path alias — must appear in router.routes BEFORE /{product_id}
# so Starlette matches it before the UUID wildcard.
router.add_api_route("/search", search_products, response_model=ProductSearchResult, methods=["GET"])


# ── Bulk product fetch ────────────────────────────────────────────────────────
from pydantic import BaseModel as _BaseModel

class BulkProductRequest(_BaseModel):
    ids: List[str]


@router.post("/bulk", response_model=List[ProductWithPrices])
async def bulk_products(
    body: BulkProductRequest,
    db: AsyncSession = Depends(get_db),
):
    """Fetch multiple products by ID in a single DB round-trip.

    Used by the cart page to replace N parallel ``GET /products/{id}`` calls
    with one request. Cached per-product in Redis (same TTL as single-product
    endpoint) so repeated cart loads are instant.
    """
    if not body.ids:
        return FastAPIResponse(content="[]", media_type="application/json",
                               headers={"Cache-Control": "public, max-age=60, s-maxage=60"})

    # Validate UUIDs — silently skip malformed ones
    valid_ids: List[uuid.UUID] = []
    for raw in body.ids:
        try:
            valid_ids.append(uuid.UUID(raw))
        except ValueError:
            pass

    if not valid_ids:
        return FastAPIResponse(content="[]", media_type="application/json",
                               headers={"Cache-Control": "public, max-age=60, s-maxage=60"})

    # Check Redis cache for each ID first
    results: dict[str, str] = {}
    missing_ids: List[uuid.UUID] = []
    for pid in valid_ids:
        cached = await cache_get(f"product:v1:{pid}")
        if cached:
            results[str(pid)] = cached
        else:
            missing_ids.append(pid)

    # Fetch all cache-missing products in ONE query
    if missing_ids:
        stmt = (
            select(Product)
            .where(Product.id.in_(missing_ids), Product.is_active == True)  # noqa: E712
            .options(
                selectinload(Product.category),
                selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
            )
        )
        db_result = await db.execute(stmt)
        products = db_result.scalars().all()

        for product in products:
            enriched = _enrich(product, product.platform_prices)
            serialised = enriched.model_dump_json()
            # Populate Redis cache (same TTL as single-product endpoint)
            await cache_set(f"product:v1:{product.id}", serialised, 120)
            results[str(product.id)] = serialised

    # Reassemble in request order, skip any not found
    out_parts = []
    for pid in valid_ids:
        s = results.get(str(pid))
        if s:
            out_parts.append(s)

    combined = "[" + ",".join(out_parts) + "]"
    return FastAPIResponse(
        content=combined,
        media_type="application/json",
        headers={"X-Cache": "MIXED", "Cache-Control": "public, max-age=60, s-maxage=60"},
    )


async def _refresh_prices_background(product_id: uuid.UUID) -> None:
    """Fire-and-forget price refresh — runs after response is sent."""
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as bg_db:
        try:
            engine = PriceEngine(bg_db)
            await engine.get_prices(product_id)
        except Exception:
            pass


@router.get("/{product_id}", response_model=ProductWithPrices)
async def get_product(
    product_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # ── Cache hit: return instantly, refresh in background ────────────────────
    cache_key = f"product:v1:{product_id}"
    cached = await cache_get(cache_key)
    if cached:
        # Always schedule a background refresh so cache stays fresh
        background_tasks.add_task(_refresh_prices_background, product_id)
        return FastAPIResponse(
            content=cached,
            media_type="application/json",
            headers={"X-Cache": "HIT", "Cache-Control": "public, max-age=60, s-maxage=60"},
        )

    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Schedule price refresh in background so this response returns immediately
    # with whatever prices are in the DB (seeded or previously scraped).
    background_tasks.add_task(_refresh_prices_background, product_id)

    enriched = _enrich(product, product.platform_prices)
    serialised = enriched.model_dump_json()
    # Cache individual product for 2 minutes
    await cache_set(cache_key, serialised, 120)
    return FastAPIResponse(
        content=serialised,
        media_type="application/json",
        headers={"X-Cache": "MISS", "Cache-Control": "public, max-age=60, s-maxage=60"},
    )


@router.get("/{product_id}/buy/{platform_id}")
async def redirect_to_platform(
    product_id: uuid.UUID,
    platform_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlatformPrice)
        .where(
            PlatformPrice.product_id == product_id,
            PlatformPrice.platform_id == platform_id,
            PlatformPrice.is_available == True,
        )
        .options(selectinload(PlatformPrice.platform))
    )
    listing = result.scalar_one_or_none()
    if not listing or not listing.platform_product_url:
        raise HTTPException(status_code=404, detail="Buy link not available")

    destination = intelligence_service.append_affiliate_params(listing.platform_product_url, listing.platform)
    return RedirectResponse(destination, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
