"""
Product & Search API
====================
- GET /products/         — list/search products with real-time prices
- GET /products/{id}     — single product with full cross-platform comparison
- GET /products/categories — category tree
- GET /products/featured  — homepage featured products
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
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

import json

router = APIRouter()
intelligence_service = ProductIntelligenceService()


def _enrich(product: Product, prices: List[PlatformPrice]) -> ProductWithPrices:
    """Attach live prices and compute highlight platforms."""
    intelligence = intelligence_service.build_snapshot(product, prices)
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
            buy_url=intelligence_service.build_buy_url(product.id, pp.platform.id) if pp.platform_product_url else None,
            last_updated=pp.last_updated,
        )
        for pp in prices
        if pp.is_available
    ]

    cheapest = min(price_outs, key=lambda p: p.price, default=None) if price_outs else None
    fastest = (
        min(
            [p for p in price_outs if p.delivery_time_minutes],
            key=lambda p: p.delivery_time_minutes,
            default=None,
        )
        if price_outs
        else None
    )

    def bv_score(p: PlatformPriceOut) -> float:
        prices_list = [x.price for x in price_outs]
        min_p, max_p = min(prices_list, default=1), max(prices_list, default=1)
        times = [x.delivery_time_minutes or 60 for x in price_outs]
        min_t, max_t = min(times, default=1), max(times, default=1)
        np_ = (p.price - min_p) / (max_p - min_p + 1e-9)
        nt = ((p.delivery_time_minutes or 60) - min_t) / (max_t - min_t + 1e-9)
        return 0.7 * np_ + 0.3 * nt

    best_value = min(price_outs, key=bv_score, default=None) if price_outs else None
    eta_values = [price.delivery_time_minutes for price in prices if price.is_available and price.delivery_time_minutes]

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
            live_offer_count=len(price_outs),
        ),
    )


@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    cache_key = "categories:all"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    result = await db.execute(
        select(Category)
        .where(Category.is_active == True, Category.parent_id == None)  # noqa: E711
        .order_by(Category.display_order)
    )
    categories = result.scalars().all()
    out = [CategoryOut.model_validate(c).model_dump(mode="json") for c in categories]
    await cache_set(cache_key, json.dumps(out), 3600)
    return out


@router.get("/featured", response_model=List[ProductWithPrices])
async def featured_products(
    limit: int = Query(default=60, le=100),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"featured:v2:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    result = await db.execute(
        select(Product)
        .where(Product.is_active == True, Product.is_featured == True)  # noqa: E712
        .options(
            selectinload(Product.category),
            selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
        )
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    products = result.scalars().all()
    enriched = [_enrich(p, p.platform_prices) for p in products]
    out = [e.model_dump(mode="json") for e in enriched]
    # Cache for 5 minutes
    await cache_set(cache_key, json.dumps(out), 300)
    return enriched


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
):
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

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
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

    return ProductSearchResult(total=total, page=page, page_size=page_size, items=enriched)


@router.get("/{product_id}", response_model=ProductWithPrices)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
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

    # Attempt live price refresh — fail silently so product page always loads
    try:
        engine = PriceEngine(db)
        await engine.get_prices(product_id)
    except Exception:
        pass

    # Re-fetch with eager loading after price engine (which may have committed the
    # session and expired our previously-loaded relationships).
    result2 = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.platform_prices).selectinload(PlatformPrice.platform),
        )
    )
    product = result2.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return _enrich(product, product.platform_prices)


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
