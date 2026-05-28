"""Admin API — platform management, product creation, price monitoring."""
import asyncio
import re
import uuid
from datetime import timezone, datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis_client import cache_delete_pattern
from app.config import settings
from app.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.cart import Cart, CartItem
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Category, Product
from sqlalchemy import or_
from app.models.user import User
from app.schemas import PlatformOut

router = APIRouter()


# ── Bootstrap (one-time admin creation) ──────────────────────────────────────

class BootstrapRequest(BaseModel):
    setup_key: str
    email: str
    password: str
    full_name: str = "Admin"


@router.post("/bootstrap", status_code=201)
async def bootstrap_admin(body: BootstrapRequest, db: AsyncSession = Depends(get_db)):
    """
    Create the first admin user. Requires ADMIN_SETUP_KEY env var to match.
    Disable after first use by clearing ADMIN_SETUP_KEY in Render env vars.
    """
    from app.config import settings
    from app.services.auth_service import create_user, get_user_by_email

    if not settings.ADMIN_SETUP_KEY or body.setup_key != settings.ADMIN_SETUP_KEY:
        raise HTTPException(status_code=403, detail="Invalid setup key")

    existing = await get_user_by_email(db, body.email)
    if existing:
        existing.is_admin = True
        await db.commit()
        return {"status": "promoted", "email": existing.email, "id": str(existing.id)}

    user = await create_user(db, body.email, body.password, body.full_name)
    user.is_admin = True
    await db.commit()
    return {"status": "created", "email": user.email, "id": str(user.id)}


# ── Schemas ───────────────────────────────────────────────────────────────────

class PlatformCreate(BaseModel):
    slug: str
    name: str
    logo_url: Optional[str] = None
    base_url: Optional[str] = None
    color_hex: Optional[str] = None
    avg_delivery_minutes: int = 15
    min_order_amount: float = 0
    delivery_fee: float = 0
    free_delivery_threshold: Optional[float] = None
    scraping_enabled: bool = True


class ProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    category_slug: Optional[str] = None
    tags: Optional[List[str]] = None
    is_featured: bool = False


class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = None
    display_order: int = 0


# ── Platform CRUD ─────────────────────────────────────────────────────────────

@router.get("/platforms", response_model=List[PlatformOut])
async def list_platforms(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    result = await db.execute(select(Platform))
    return result.scalars().all()


@router.post("/platforms", response_model=PlatformOut, status_code=201)
async def create_platform(
    body: PlatformCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    existing = await db.execute(select(Platform).where(Platform.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Platform slug already exists")
    platform = Platform(**body.model_dump())
    db.add(platform)
    await db.flush()
    return platform


@router.patch("/platforms/{platform_id}")
async def toggle_platform(
    platform_id: uuid.UUID,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    platform = await db.get(Platform, platform_id)
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    platform.is_active = is_active
    return {"id": str(platform.id), "is_active": platform.is_active}


# ── Product CRUD ──────────────────────────────────────────────────────────────

@router.post("/products", status_code=201)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    from python_slugify import slugify  # type: ignore

    category = None
    if body.category_slug:
        result = await db.execute(select(Category).where(Category.slug == body.category_slug))
        category = result.scalar_one_or_none()

    slug = slugify(f"{body.name}-{body.brand or ''}")
    product = Product(
        slug=slug,
        name=body.name,
        brand=body.brand,
        description=body.description,
        unit=body.unit,
        tags=body.tags,
        is_featured=body.is_featured,
        category_id=category.id if category else None,
    )
    db.add(product)
    await db.flush()
    return {"id": str(product.id), "slug": product.slug}


# ── Amazon Affiliate Price Management ────────────────────────────────────────

class AmazonPriceUpsert(BaseModel):
    price: float
    mrp: float
    asin: str
    image_url: Optional[str] = None
    affiliate_link: str   # amzn.to/... from SiteStripe


@router.get("/products/search")
async def search_products_admin(
    q: str = Query("", min_length=0),
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Search products by name/brand for the admin Amazon price tool."""
    stmt = select(Product).where(Product.is_active.is_(True))
    if q.strip():
        stmt = stmt.where(
            or_(Product.name.ilike(f"%{q}%"), Product.brand.ilike(f"%{q}%"))
        )
    stmt = stmt.limit(limit).order_by(Product.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {"id": str(p.id), "slug": p.slug, "name": p.name, "brand": p.brand, "unit": p.unit}
        for p in rows
    ]


@router.post("/products/{product_slug}/amazon")
async def upsert_amazon_price(
    product_slug: str,
    body: AmazonPriceUpsert,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Manually set Amazon affiliate price for a product (bypasses scraper)."""
    product = (await db.execute(select(Product).where(Product.slug == product_slug))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_slug}' not found")

    amazon = (await db.execute(select(Platform).where(Platform.slug == "amazon"))).scalar_one_or_none()
    if not amazon:
        raise HTTPException(status_code=404, detail="Amazon platform not seeded — run seed_platforms.py first")

    discount = round(((body.mrp - body.price) / body.mrp) * 100, 1) if body.mrp > body.price else 0.0

    existing = (await db.execute(
        select(PlatformPrice).where(
            and_(PlatformPrice.product_id == product.id, PlatformPrice.platform_id == amazon.id)
        )
    )).scalar_one_or_none()

    if existing:
        existing.price = body.price
        existing.original_price = body.mrp
        existing.discount_percent = discount
        existing.discount_label = f"{int(discount)}% OFF" if discount >= 1 else None
        existing.platform_product_id = body.asin
        existing.platform_product_url = body.affiliate_link
        existing.platform_image_url = body.image_url
        existing.is_available = True
        existing.delivery_time_minutes = 120
        existing.source = "manual"
    else:
        db.add(PlatformPrice(
            product_id=product.id,
            platform_id=amazon.id,
            price=body.price,
            original_price=body.mrp,
            discount_percent=discount,
            discount_label=f"{int(discount)}% OFF" if discount >= 1 else None,
            platform_product_id=body.asin,
            platform_product_url=body.affiliate_link,
            platform_image_url=body.image_url,
            is_available=True,
            delivery_time_minutes=120,
            source="manual",
        ))

    await db.commit()
    await cache_delete_pattern(f"prices:{product.id}*")
    return {"status": "saved", "product_slug": product.slug, "asin": body.asin, "price": body.price, "discount": discount}


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    product_count = (await db.execute(select(func.count()).select_from(Product))).scalar()
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar()
    platform_count = (
        await db.execute(
            select(func.count()).select_from(Platform).where(Platform.is_active.is_(True))
        )
    ).scalar()

    active_cart_count = (
        await db.execute(select(func.count()).select_from(Cart).where(Cart.is_active.is_(True)))
    ).scalar()

    return {
        "total_products": product_count,
        "total_users": user_count,
        "active_platforms": platform_count,
        "active_carts": active_cart_count,
    }


@router.get("/db-overview")
async def db_overview(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Full database snapshot — every table, counts, and key aggregates."""
    # Lazy imports so a missing model never crashes the whole admin router
    from app.models.analytics import UserEvent
    from app.models.cart import Wishlist, WishlistItem, RefreshToken
    from app.models.price import PriceHistory, PriceAlert

    async def scalar(stmt):
        return (await db.execute(stmt)).scalar() or 0

    # ── Users ────────────────────────────────────────────────────────────────
    total_users       = await scalar(select(func.count()).select_from(User))
    active_users      = await scalar(select(func.count()).select_from(User).where(User.is_active.is_(True)))
    verified_users    = await scalar(select(func.count()).select_from(User).where(User.is_verified.is_(True)))
    admin_users       = await scalar(select(func.count()).select_from(User).where(User.is_admin.is_(True)))
    oauth_users       = await scalar(select(func.count()).select_from(User).where(User.oauth_provider.is_not(None)))

    # signups per day last 30 days
    signup_trend_rows = (await db.execute(
        select(func.date(User.created_at).label("day"), func.count(User.id).label("count"))
        .where(User.created_at >= datetime.now(timezone.utc) - timedelta(days=30))
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )).all()
    signup_trend = [{"day": str(r.day), "count": int(r.count)} for r in signup_trend_rows]

    # ── Products ─────────────────────────────────────────────────────────────
    total_products   = await scalar(select(func.count()).select_from(Product))
    active_products  = await scalar(select(func.count()).select_from(Product).where(Product.is_active.is_(True)))
    featured_products= await scalar(select(func.count()).select_from(Product).where(Product.is_featured.is_(True)))
    with_images      = await scalar(select(func.count()).select_from(Product).where(Product.image_url.is_not(None)))

    by_category_rows = (await db.execute(
        select(Category.name, func.count(Product.id).label("count"))
        .join(Product, Product.category_id == Category.id, isouter=True)
        .group_by(Category.id, Category.name)
        .order_by(func.count(Product.id).desc())
    )).all()
    by_category = [{"category": r.name, "count": int(r.count)} for r in by_category_rows]

    top_brands_rows = (await db.execute(
        select(Product.brand, func.count(Product.id).label("count"))
        .where(Product.brand.is_not(None))
        .group_by(Product.brand)
        .order_by(func.count(Product.id).desc())
        .limit(10)
    )).all()
    top_brands = [{"brand": r.brand, "count": int(r.count)} for r in top_brands_rows]

    # ── Categories ───────────────────────────────────────────────────────────
    total_categories  = await scalar(select(func.count()).select_from(Category))
    active_categories = await scalar(select(func.count()).select_from(Category).where(Category.is_active.is_(True)))

    category_rows = (await db.execute(
        select(Category.slug, Category.name, Category.icon,
               func.count(Product.id).label("product_count"))
        .join(Product, Product.category_id == Category.id, isouter=True)
        .group_by(Category.id, Category.slug, Category.name, Category.icon)
        .order_by(Category.display_order)
    )).all()
    categories_detail = [
        {"slug": r.slug, "name": r.name, "icon": r.icon, "product_count": int(r.product_count)}
        for r in category_rows
    ]

    # ── Platforms ────────────────────────────────────────────────────────────
    total_platforms  = await scalar(select(func.count()).select_from(Platform))
    active_platforms = await scalar(select(func.count()).select_from(Platform).where(Platform.is_active.is_(True)))

    platform_rows = (await db.execute(
        select(Platform.slug, Platform.name, Platform.is_active, Platform.color_hex,
               Platform.scraping_enabled, Platform.scrape_failure_count,
               Platform.last_successful_scrape,
               func.count(PlatformPrice.id).label("price_entries"))
        .join(PlatformPrice, PlatformPrice.platform_id == Platform.id, isouter=True)
        .group_by(Platform.id, Platform.slug, Platform.name, Platform.is_active,
                  Platform.color_hex, Platform.scraping_enabled,
                  Platform.scrape_failure_count, Platform.last_successful_scrape)
        .order_by(Platform.name)
    )).all()
    platforms_detail = [
        {
            "slug": r.slug, "name": r.name, "is_active": r.is_active,
            "color_hex": r.color_hex, "scraping_enabled": r.scraping_enabled,
            "scrape_failure_count": int(r.scrape_failure_count or 0),
            "last_successful_scrape": r.last_successful_scrape.isoformat() if r.last_successful_scrape else None,
            "price_entries": int(r.price_entries),
        }
        for r in platform_rows
    ]

    # ── Platform Prices ──────────────────────────────────────────────────────
    total_prices     = await scalar(select(func.count()).select_from(PlatformPrice))
    avail_prices     = await scalar(select(func.count()).select_from(PlatformPrice).where(PlatformPrice.is_available.is_(True)))
    avg_discount     = (await db.execute(
        select(func.avg(PlatformPrice.discount_percent)).where(PlatformPrice.discount_percent > 0)
    )).scalar() or 0

    prices_by_plat_rows = (await db.execute(
        select(Platform.name, Platform.slug,
               func.count(PlatformPrice.id).label("count"),
               func.avg(PlatformPrice.price).label("avg_price"),
               func.min(PlatformPrice.price).label("min_price"),
               func.max(PlatformPrice.price).label("max_price"))
        .join(Platform, Platform.id == PlatformPrice.platform_id)
        .group_by(Platform.id, Platform.name, Platform.slug)
        .order_by(func.count(PlatformPrice.id).desc())
    )).all()
    prices_by_platform = [
        {
            "name": r.name, "slug": r.slug, "count": int(r.count),
            "avg_price": round(float(r.avg_price or 0), 2),
            "min_price": round(float(r.min_price or 0), 2),
            "max_price": round(float(r.max_price or 0), 2),
        }
        for r in prices_by_plat_rows
    ]

    # ── Price History ────────────────────────────────────────────────────────
    total_price_history = await scalar(select(func.count()).select_from(PriceHistory))

    # ── Price Alerts ─────────────────────────────────────────────────────────
    total_alerts     = await scalar(select(func.count()).select_from(PriceAlert))
    active_alerts    = await scalar(select(func.count()).select_from(PriceAlert).where(PriceAlert.is_active.is_(True)))
    triggered_alerts = await scalar(select(func.count()).select_from(PriceAlert).where(PriceAlert.triggered_at.is_not(None)))

    # ── Carts ────────────────────────────────────────────────────────────────
    total_carts      = await scalar(select(func.count()).select_from(Cart))
    active_carts     = await scalar(select(func.count()).select_from(Cart).where(Cart.is_active.is_(True)))
    guest_carts      = await scalar(select(func.count()).select_from(Cart).where(Cart.user_id.is_(None)))
    total_cart_items = await scalar(select(func.count()).select_from(CartItem))
    total_cart_value = (await db.execute(
        select(func.sum(CartItem.quantity * func.coalesce(CartItem.snapshot_price, 0)))
    )).scalar() or 0

    # ── Wishlists ────────────────────────────────────────────────────────────
    total_wishlists      = await scalar(select(func.count()).select_from(Wishlist))
    total_wishlist_items = await scalar(select(func.count()).select_from(WishlistItem))

    # ── Refresh Tokens ───────────────────────────────────────────────────────
    total_tokens  = await scalar(select(func.count()).select_from(RefreshToken))
    active_tokens = await scalar(
        select(func.count()).select_from(RefreshToken)
        .where(RefreshToken.is_revoked.is_(False))
        .where(RefreshToken.expires_at > datetime.now(timezone.utc))
    )

    # ── User Events ──────────────────────────────────────────────────────────
    total_events = await scalar(select(func.count()).select_from(UserEvent))
    events_by_type_rows = (await db.execute(
        select(UserEvent.event_type, func.count(UserEvent.id).label("count"))
        .group_by(UserEvent.event_type)
        .order_by(func.count(UserEvent.id).desc())
    )).all()
    events_by_type = [{"type": r.event_type, "count": int(r.count)} for r in events_by_type_rows]

    # events per day last 14 days
    event_trend_rows = (await db.execute(
        select(func.date(UserEvent.created_at).label("day"), func.count(UserEvent.id).label("count"))
        .where(UserEvent.created_at >= datetime.now(timezone.utc) - timedelta(days=14))
        .group_by(func.date(UserEvent.created_at))
        .order_by(func.date(UserEvent.created_at))
    )).all()
    event_trend = [{"day": str(r.day), "count": int(r.count)} for r in event_trend_rows]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "users": {
            "total": total_users, "active": active_users, "verified": verified_users,
            "admin_count": admin_users, "oauth_users": oauth_users,
            "password_users": total_users - oauth_users,
            "signup_trend": signup_trend,
        },
        "products": {
            "total": total_products, "active": active_products, "featured": featured_products,
            "with_images": with_images, "by_category": by_category, "top_brands": top_brands,
        },
        "categories": {
            "total": total_categories, "active": active_categories, "detail": categories_detail,
        },
        "platforms": {
            "total": total_platforms, "active": active_platforms, "detail": platforms_detail,
        },
        "prices": {
            "total": total_prices, "available": avail_prices,
            "unavailable": total_prices - avail_prices,
            "avg_discount_percent": round(float(avg_discount), 1),
            "by_platform": prices_by_platform,
        },
        "price_history": {"total": total_price_history},
        "price_alerts": {
            "total": total_alerts, "active": active_alerts, "triggered": triggered_alerts,
        },
        "carts": {
            "total": total_carts, "active": active_carts, "guest": guest_carts,
            "total_items": total_cart_items,
            "total_value_inr": round(float(total_cart_value), 2),
        },
        "wishlists": {"total": total_wishlists, "total_items": total_wishlist_items},
        "refresh_tokens": {"total": total_tokens, "active": active_tokens},
        "user_events": {
            "total": total_events, "by_type": events_by_type, "trend": event_trend,
        },
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    users = result.scalars().all()

    rows: list[dict[str, Any]] = []
    for u in users:
        rows.append(
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                # Never expose raw password. Only return safety metadata.
                "password_status": "Password Set" if u.hashed_password else "OAuth Only",
                "password_hash_preview": f"{u.hashed_password[:12]}..." if u.hashed_password else None,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "city": u.city,
                "pincode": u.pincode,
                "avatar_url": u.avatar_url,
                "created_at": u.created_at,
                "last_login_at": u.last_login_at,
            }
        )

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    return {
        "total": total_users,
        "limit": limit,
        "offset": offset,
        "items": rows,
    }


@router.get("/users/{user_id}/cart")
async def get_user_cart_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Return the active cart items for a specific user, including product and platform info."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user_result = await db.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cart_result = await db.execute(
        select(Cart).where(and_(Cart.user_id == uid, Cart.is_active.is_(True)))
        .order_by(Cart.updated_at.desc())
        .limit(1)
    )
    cart = cart_result.scalar_one_or_none()

    if not cart:
        return {
            "user_id": user_id,
            "email": user.email,
            "full_name": user.full_name,
            "last_login_at": user.last_login_at,
            "cart": None,
            "items": [],
            "total": 0.0,
        }

    items_result = await db.execute(
        select(CartItem, Product, Platform)
        .join(Product, CartItem.product_id == Product.id)
        .outerjoin(Platform, CartItem.selected_platform_id == Platform.id)
        .where(CartItem.cart_id == cart.id)
    )
    rows = items_result.all()

    items = []
    total = 0.0
    for cart_item, product, platform in rows:
        price = float(cart_item.snapshot_price or 0)
        subtotal = price * cart_item.quantity
        total += subtotal
        items.append({
            "item_id": str(cart_item.id),
            "product_id": str(product.id),
            "product_name": product.name,
            "brand": product.brand,
            "unit": product.unit,
            "image_url": product.thumbnail_url or product.image_url,
            "quantity": cart_item.quantity,
            "price": price,
            "subtotal": subtotal,
            "platform": platform.name if platform else None,
            "platform_slug": platform.slug if platform else None,
            "added_at": cart_item.added_at,
        })

    return {
        "user_id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "last_login_at": user.last_login_at,
        "cart": {
            "id": str(cart.id),
            "created_at": cart.created_at,
            "updated_at": cart.updated_at,
        },
        "items": items,
        "total": round(total, 2),
    }


@router.get("/logins/daily")
async def daily_logins(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
    days: int = Query(default=7, ge=1, le=60),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    daily_result = await db.execute(
        select(
            func.date(User.last_login_at).label("day"),
            func.count(User.id).label("count"),
        )
        .where(and_(User.last_login_at.is_not(None), User.last_login_at >= since))
        .group_by(func.date(User.last_login_at))
        .order_by(func.date(User.last_login_at))
    )
    trend = [{"day": str(day), "count": int(count)} for day, count in daily_result.all()]

    last_24h = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .where(User.last_login_at >= (datetime.now(timezone.utc) - timedelta(days=1)))
        )
    ).scalar() or 0

    return {
        "window_days": days,
        "last_24h": int(last_24h),
        "trend": trend,
    }


@router.get("/payments")
async def payment_overview(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    # This project currently has carts but no finalized payment/order tables.
    # We expose a payment-like view using cart line totals as an operational proxy.
    rows_result = await db.execute(
        select(
            User.id,
            User.full_name,
            User.email,
            func.sum(CartItem.quantity).label("items_count"),
            func.sum(CartItem.quantity * func.coalesce(CartItem.snapshot_price, 0)).label("amount"),
        )
        .select_from(User)
        .join(Cart, Cart.user_id == User.id)
        .join(CartItem, CartItem.cart_id == Cart.id)
        .group_by(User.id, User.full_name, User.email)
        .order_by(func.sum(CartItem.quantity * func.coalesce(CartItem.snapshot_price, 0)).desc())
    )

    items: list[dict[str, Any]] = []
    total_amount = Decimal("0")
    total_items = 0

    for user_id, full_name, email, items_count, amount in rows_result.all():
        amount_value = float(amount or 0)
        total_amount += Decimal(str(amount_value))
        total_items += int(items_count or 0)
        items.append(
            {
                "user_id": str(user_id),
                "full_name": full_name,
                "email": email,
                "items_count": int(items_count or 0),
                "amount": amount_value,
            }
        )

    return {
        "summary": {
            "total_users_with_cart_value": len(items),
            "total_items": total_items,
            "total_amount": float(total_amount),
            "currency": "INR",
            "note": "Proxy from cart snapshot totals; finalized payment table not yet implemented.",
        },
        "items": items,
    }


@router.get("/queries")
async def query_overview(
    _admin=Depends(require_admin),
):
    # Placeholder until support/contact query table is added.
    return {
        "total": 0,
        "items": [],
        "note": "Support queries module not yet integrated in backend models.",
    }


# ── Blinkit bulk scraper ──────────────────────────────────────────────────────

BLINKIT_SEARCH_V6 = "https://blinkit.com/v6/listing/products"
BLINKIT_BASE = "https://blinkit.com"
BLINKIT_DELIVERY_MINS = 10

SCRAPE_CATEGORY_QUERIES = [
    ("fruits-vegetables", ["fresh onion", "tomato", "banana", "spinach", "apple", "potato", "carrot", "capsicum", "cucumber", "mango"]),
    ("dairy-breakfast",   ["amul milk", "amul butter", "mother dairy curd", "farm eggs", "amul paneer", "amul cheese", "epigamia greek yogurt"]),
    ("snacks-drinks",     ["lays magic masala", "coca cola", "kurkure masala", "red bull", "haldirams bhujia", "tropicana juice", "pepsi", "doritos"]),
    ("bakery",            ["britannia 5050 biscuit", "harvest gold bread", "oreo cream biscuit", "good day biscuit", "parle g"]),
    ("staples",           ["aashirvaad atta", "india gate basmati rice", "toor dal", "chana dal", "moong dal", "poha", "besan"]),
    ("oils-spices",       ["fortune sunflower oil", "saffola oil", "everest red chilli powder", "mdh masala", "turmeric powder", "salt"]),
    ("household",         ["vim dishwash bar", "surf excel", "harpic power plus", "lizol floor cleaner", "dettol liquid", "ariel detergent"]),
    ("personal-care",     ["dove soap", "head shoulders shampoo", "colgate toothpaste", "nivea lotion", "dettol soap", "vaseline"]),
    ("chicken-meat",      ["licious chicken breast", "licious chicken curry cut", "brown eggs country delight"]),
    ("frozen-foods",      ["mccain french fries", "frozen corn", "igloo ice cream"]),
]


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:200]


def _build_blinkit_image(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    if raw.startswith("http"):
        return raw
    name = raw.lstrip("/")
    if name.startswith("rsku_image/products_main/"):
        return f"https://cdn.blinkit.com/{name}"
    return f"https://cdn.blinkit.com/rsku_image/products_main/{name}"


def _parse_blinkit_product(raw: dict, cat_slug: str) -> Optional[dict]:
    price = float(raw.get("price") or 0)
    mrp = float(raw.get("mrp") or price)
    if price <= 0 and mrp <= 0:
        return None
    if price <= 0:
        price = mrp

    raw_imgs = raw.get("images") or []
    if raw_imgs:
        first = raw_imgs[0]
        raw_img = first.get("name") or first.get("url") or (first if isinstance(first, str) else None)
    else:
        raw_img = raw.get("image_url") or raw.get("thumbnail")
    image_url = _build_blinkit_image(raw_img)

    name = (raw.get("name") or raw.get("product_name") or "").strip()
    brand = (raw.get("brand") or raw.get("brand_name") or "").strip()
    unit = (raw.get("unit") or raw.get("quantity") or raw.get("variant_name") or "").strip()
    pid = str(raw.get("id") or raw.get("product_id") or raw.get("variant_id") or "")
    slug_raw = raw.get("slug") or pid or name
    slug = _slugify(slug_raw)

    if not name or not slug:
        return None

    discount = round((mrp - price) / mrp * 100, 1) if mrp > price else 0.0
    in_stock = bool(raw.get("in_stock") or raw.get("available") or raw.get("is_in_stock"))
    product_url = f"{BLINKIT_BASE}/prn/{raw.get('slug') or pid}" if (raw.get("slug") or pid) else None

    return {
        "blinkit_pid": pid, "name": name, "brand": brand or None,
        "unit": unit or None, "slug": slug, "category_slug": cat_slug,
        "image_url": image_url, "price": price, "mrp": mrp,
        "discount_percent": discount, "is_available": in_stock,
        "product_url": product_url,
        "tags": [t.lower() for t in [name, brand, cat_slug] if t],
    }


async def _run_blinkit_scrape(db_url: str) -> dict:
    """Background task: scrape Blinkit and upsert into DB."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker as sm

    lat = str(getattr(settings, "BLINKIT_LAT", "28.4511202"))
    lon = str(getattr(settings, "BLINKIT_LON", "77.0965147"))

    engine = create_async_engine(db_url, echo=False)
    AsyncSess = sm(engine, class_=AsyncSession, expire_on_commit=False)

    total_saved = 0
    seen: set[str] = set()

    async with AsyncSess() as db:
        r = await db.execute(select(Platform).where(Platform.slug == "blinkit"))
        platform = r.scalar_one_or_none()
        if not platform:
            await engine.dispose()
            return {"error": "Blinkit platform not in DB"}

        r2 = await db.execute(select(Category))
        cat_map = {c.slug: c.id for c in r2.scalars().all()}

        headers = {
            "app_client": "consumer_web", "lat": lat, "lon": lon,
            "rn_bundle_version": "1000033", "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-IN,en;q=0.9", "Origin": BLINKIT_BASE,
            "web-version": "2024120401",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            for cat_slug, queries in SCRAPE_CATEGORY_QUERIES:
                for query in queries:
                    await asyncio.sleep(0.3)
                    try:
                        resp = await client.get(
                            BLINKIT_SEARCH_V6,
                            params={"q": query, "start": 0, "limit": 20, "search_type": 8},
                            headers={**headers, "Referer": f"{BLINKIT_BASE}/search?q={quote_plus(query)}"},
                        )
                        resp.raise_for_status()
                        data = resp.json()
                    except Exception:
                        continue

                    raw_list = []
                    for obj in (data.get("objects") or []):
                        if isinstance(obj, dict) and obj.get("type") == "PRODUCT" and "data" in obj:
                            raw_list.append(obj["data"])
                    if not raw_list:
                        raw_list = data.get("products") or data.get("results") or (data if isinstance(data, list) else [])

                    for raw in raw_list:
                        item = _parse_blinkit_product(raw, cat_slug)
                        if not item or item["slug"] in seen:
                            continue
                        seen.add(item["slug"])

                        try:
                            # Upsert product
                            rp = await db.execute(select(Product).where(Product.slug == item["slug"]))
                            product = rp.scalar_one_or_none()
                            cat_id = cat_map.get(item["category_slug"])
                            if product is None:
                                product = Product(
                                    slug=item["slug"], name=item["name"], brand=item["brand"],
                                    unit=item["unit"], category_id=cat_id,
                                    image_url=item["image_url"], thumbnail_url=item["image_url"],
                                    tags=item["tags"], is_featured=True, is_active=True,
                                    description=f"{item['name']} — available on Blinkit.",
                                )
                                db.add(product)
                                await db.flush()
                            else:
                                if item["image_url"]:
                                    product.image_url = item["image_url"]
                                    product.thumbnail_url = item["image_url"]
                                product.is_featured = True
                                product.is_active = True
                                await db.flush()

                            # Upsert platform price
                            rpp = await db.execute(
                                select(PlatformPrice).where(
                                    PlatformPrice.product_id == product.id,
                                    PlatformPrice.platform_id == platform.id,
                                )
                            )
                            pp = rpp.scalar_one_or_none()
                            discount_label = f"{int(item['discount_percent'])}% OFF" if item["discount_percent"] > 0 else None
                            if pp is None:
                                pp = PlatformPrice(
                                    product_id=product.id, platform_id=platform.id,
                                    price=item["price"],
                                    original_price=item["mrp"] if item["mrp"] > item["price"] else None,
                                    discount_percent=item["discount_percent"],
                                    discount_label=discount_label, is_available=item["is_available"],
                                    delivery_time_minutes=BLINKIT_DELIVERY_MINS,
                                    platform_product_id=item["blinkit_pid"] or None,
                                    platform_product_url=item["product_url"],
                                    platform_image_url=item["image_url"], source="scrape",
                                )
                                db.add(pp)
                            else:
                                pp.price = item["price"]
                                pp.original_price = item["mrp"] if item["mrp"] > item["price"] else None
                                pp.discount_percent = item["discount_percent"]
                                pp.discount_label = discount_label
                                pp.is_available = item["is_available"]
                                pp.delivery_time_minutes = BLINKIT_DELIVERY_MINS
                                if item["image_url"]:
                                    pp.platform_image_url = item["image_url"]
                                if item["product_url"]:
                                    pp.platform_product_url = item["product_url"]
                                pp.source = "scrape"
                            await db.flush()
                            total_saved += 1
                        except Exception:
                            await db.rollback()

                await db.commit()

    await engine.dispose()
    # Bust the featured cache so next request gets fresh data
    await cache_delete_pattern("featured:*")
    return {"scraped": len(seen), "saved": total_saved}


_scrape_status: dict = {"running": False, "last_result": None, "started_at": None}


@router.post("/scrape-blinkit")
async def trigger_blinkit_scrape(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Trigger a background Blinkit bulk scrape. Check status via GET /admin/scrape-status."""
    if _scrape_status["running"]:
        return {"status": "already_running", "started_at": _scrape_status["started_at"]}

    _scrape_status["running"] = True
    _scrape_status["started_at"] = datetime.now(timezone.utc).isoformat()
    _scrape_status["last_result"] = None

    async def _job():
        try:
            result = await _run_blinkit_scrape(settings.DATABASE_URL)
            _scrape_status["last_result"] = result
        finally:
            _scrape_status["running"] = False

    background_tasks.add_task(_job)
    return {"status": "started", "started_at": _scrape_status["started_at"]}


@router.get("/scrape-status")
async def scrape_status(_admin=Depends(require_admin)):
    return _scrape_status


# ── Scrape All Platforms ───────────────────────────────────────────────────────

_scrape_all_status: dict = {"running": False, "last_result": None, "started_at": None, "progress": ""}


@router.post("/scrape-all")
async def trigger_full_scrape(
    background_tasks: BackgroundTasks,
    _admin=Depends(require_admin),
):
    """
    Trigger a full multi-platform scrape + seed.
    Seeds all platforms, categories, then scrapes Blinkit (primary)
    + Zepto, BigBasket, Instamart, JioMart, Amazon for cross-platform prices.
    Check progress via GET /admin/scrape-all-status.
    """
    if _scrape_all_status["running"]:
        return {"status": "already_running", "started_at": _scrape_all_status["started_at"]}

    _scrape_all_status["running"]    = True
    _scrape_all_status["started_at"] = datetime.now(timezone.utc).isoformat()
    _scrape_all_status["last_result"] = None
    _scrape_all_status["progress"]   = "starting"

    async def _job():
        try:
            import subprocess, sys, os
            script = os.path.join(
                os.path.dirname(__file__), "..", "..", "..", "..", "..", "scripts", "seed_and_scrape_all.py"
            )
            script = os.path.abspath(script)
            _scrape_all_status["progress"] = "running seed_and_scrape_all.py"
            proc = await asyncio.create_subprocess_exec(
                sys.executable, script,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=os.path.dirname(script),
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode() if stdout else ""
            success = proc.returncode == 0
            await cache_delete_pattern("featured:*")
            _scrape_all_status["last_result"] = {
                "success": success,
                "returncode": proc.returncode,
                "output_tail": output[-2000:] if output else "",
            }
            _scrape_all_status["progress"] = "done"
        except Exception as exc:
            _scrape_all_status["last_result"] = {"error": str(exc)}
            _scrape_all_status["progress"] = "failed"
        finally:
            _scrape_all_status["running"] = False

    background_tasks.add_task(_job)
    return {"status": "started", "started_at": _scrape_all_status["started_at"]}


@router.get("/scrape-all-status")
async def scrape_all_status(_admin=Depends(require_admin)):
    return _scrape_all_status


# ── Seed ──────────────────────────────────────────────────────────────────────

@router.post("/seed", status_code=200)
async def run_seed(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Upsert all 10 platforms, categories, and sample products. Safe to run multiple times."""
    from scripts.seed_platforms import PLATFORMS, CATEGORIES, PRODUCTS

    created = {"platforms": [], "categories": [], "products": []}
    updated = {"platforms": [], "categories": [], "products": []}

    # Platforms
    for p in PLATFORMS:
        result = await db.execute(select(Platform).where(Platform.slug == p["slug"]))
        existing = result.scalar_one_or_none()
        if existing:
            for k, v in p.items():
                setattr(existing, k, v)
            updated["platforms"].append(p["slug"])
        else:
            db.add(Platform(**p))
            created["platforms"].append(p["slug"])
    await db.flush()

    # Categories
    cat_map: dict[str, Category] = {}
    for c in CATEGORIES:
        result = await db.execute(select(Category).where(Category.slug == c["slug"]))
        existing = result.scalar_one_or_none()
        if existing:
            cat_map[c["slug"]] = existing
            updated["categories"].append(c["slug"])
        else:
            cat = Category(**c)
            db.add(cat)
            await db.flush()
            cat_map[c["slug"]] = cat
            created["categories"].append(c["slug"])

    # Products
    for p in list(PRODUCTS):
        p = dict(p)
        cat_slug = p.pop("category_slug", None)
        cat = cat_map.get(cat_slug) if cat_slug else None
        p["category_id"] = cat.id if cat else None
        result = await db.execute(select(Product).where(Product.slug == p["slug"]))
        existing = result.scalar_one_or_none()
        if existing:
            for k, v in p.items():
                setattr(existing, k, v)
            updated["products"].append(p["slug"])
        else:
            db.add(Product(**p))
            created["products"].append(p["slug"])

    await db.commit()
    return {"created": created, "updated": updated}

# ── Catalog audit ─────────────────────────────────────────────────────────────

# Keywords used to detect category mismatches
# Keywords that STRONGLY identify a category (product name contains these → belongs here)
# Use multi-word phrases first (more specific), then single words.
# Words that are ambiguous (e.g. "banana" can be a fruit OR banana chips) are NOT listed here.
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "dairy-eggs":        ["milk", "curd", "yogurt", "butter", "cheese", "paneer", "cream cheese",
                          "ghee", "lassi", "whey protein", "buttermilk", "skimmed milk"],
    "fruits-vegetables": ["fresh apple", "fresh banana", "fresh mango", "fresh tomato",
                          "fresh potato", "fresh onion", "fresh spinach", "fresh carrot",
                          "fresh orange", "fresh lemon", "fresh grape", "broccoli",
                          "cauliflower", "fresh peas", "fresh beans", "fresh cabbage",
                          "fresh cucumber", "fresh capsicum", "raw vegetable", "raw fruit"],
    "snacks":            ["chips", "biscuit", "cookie", "namkeen", "bhujia", "popcorn",
                          "wafer", "cracker", "snack", "puff", "pretzel", "nachos",
                          "banana chips", "potato chips", "tortilla", "murukku", "chivda",
                          "mixture", "mathri", "sev", "chakli", "fryums"],
    "beverages":         ["juice", "cola", "soda", "mineral water", "packaged water",
                          "tea bags", "coffee powder", "instant coffee", "energy drink",
                          "lemonade", "squash", "syrup", "milkshake", "smoothie",
                          "cold drink", "soft drink", "aerated", "tonic water"],
    "staples":           ["basmati rice", "brown rice", "wheat flour", "atta", "maida",
                          "besan", "dal", "lentil", "toor dal", "moong dal", "chana dal",
                          "urad dal", "masoor dal", "sugar", "salt", "refined oil",
                          "mustard oil", "sunflower oil", "olive oil", "semolina", "sooji",
                          "poha", "oats", "cornflour", "suji", "rawa"],
    "personal-care":     ["shampoo", "conditioner", "face wash", "moisturizer", "body lotion",
                          "deodorant", "toothpaste", "toothbrush", "body wash", "sunscreen",
                          "face serum", "hair oil", "hair gel", "hand wash", "sanitizer gel"],
    "household":         ["detergent", "dishwash", "toilet cleaner", "floor cleaner",
                          "surface cleaner", "scrubber", "bleach", "air freshener",
                          "garbage bag", "tissue paper", "paper towel", "wet wipes",
                          "dish soap", "laundry", "fabric softener"],
    "baby-care":         ["baby", "diaper", "nappy", "infant formula", "toddler",
                          "baby food", "baby wipes", "teether", "baby lotion", "baby shampoo"],
    "beauty":            ["lipstick", "mascara", "foundation", "blush", "kajal", "eyeliner",
                          "nail polish", "makeup", "concealer", "primer", "highlighter",
                          "face mask", "toner", "micellar", "bb cream", "cc cream"],
    "frozen":            ["frozen", "ice cream", "gelato", "sorbet", "popsicle",
                          "frozen peas", "frozen corn", "frozen paratha", "frozen snack"],
    "bakery":            ["bread", "bun", "cake", "muffin", "pastry", "rusk", "toast",
                          "croissant", "bagel", "pav", "dinner roll", "loaf"],
    "meat-seafood":      ["chicken", "mutton", "fish fillet", "prawn", "shrimp",
                          "beef", "pork", "salmon", "tuna", "seafood", "boneless chicken",
                          "chicken breast", "chicken leg", "minced meat"],
    "instant-food":      ["noodles", "pasta", "maggi", "instant noodles", "ready to eat",
                          "instant soup", "cup noodles", "ramen", "upma mix", "poha mix",
                          "oatmeal", "porridge mix", "instant oats"],
}

# These category slugs should NEVER be suggested as a mismatch for these product name fragments.
# e.g. "banana chips" in snacks should NOT be flagged as fruits-vegetables.
_CATEGORY_OVERRIDES: dict[str, list[str]] = {
    # if product name contains any of these phrases, keep it in its current category
    "snacks":            ["chips", "namkeen", "bhujia", "biscuit", "cookie", "wafer",
                          "cracker", "puff", "popcorn", "snack", "murukku", "mixture",
                          "mathri", "sev", "chivda", "fryums", "pretzel", "nachos"],
    "staples":           ["rice", "atta", "flour", "dal", "oil", "sugar", "salt",
                          "oats", "poha", "semolina", "sooji", "rawa", "lentil"],
    "beverages":         ["juice", "drink", "water", "tea", "coffee", "cola", "soda",
                          "shake", "smoothie", "squash", "syrup", "aerated"],
    "dairy-eggs":        ["milk", "curd", "yogurt", "butter", "cheese", "paneer",
                          "ghee", "cream", "lassi", "whey", "egg"],
    "bakery":            ["bread", "bun", "cake", "muffin", "rusk", "toast", "pav",
                          "croissant", "pastry", "loaf"],
    "frozen":            ["frozen", "ice cream", "gelato", "sorbet", "popsicle"],
    "instant-food":      ["noodles", "pasta", "maggi", "instant", "ready to eat",
                          "soup", "ramen", "upma", "porridge"],
    "personal-care":     ["shampoo", "conditioner", "face wash", "moisturizer", "lotion",
                          "deodorant", "toothpaste", "toothbrush", "body wash", "sunscreen",
                          "serum", "hair oil", "hand wash", "sanitizer"],
    "household":         ["detergent", "dishwash", "cleaner", "scrubber", "bleach",
                          "freshener", "tissue", "wipes", "laundry", "fabric"],
    "baby-care":         ["baby", "diaper", "nappy", "infant", "toddler", "teether"],
    "beauty":            ["lipstick", "mascara", "foundation", "kajal", "eyeliner",
                          "nail polish", "makeup", "concealer", "primer", "highlighter"],
    "meat-seafood":      ["chicken", "mutton", "fish", "prawn", "shrimp", "beef",
                          "pork", "salmon", "tuna", "seafood", "meat"],
    "fruits-vegetables": ["fresh", "raw", "vegetable", "fruit", "sabzi"],
}


def _detect_expected_category(name: str, current_slug: str) -> Optional[str]:
    """
    Return a suggested category slug only when we are highly confident the product
    is in the WRONG category.

    Rules:
    1. If the product name contains an override keyword for its current category → no mismatch.
    2. Score every category by keyword matches (multi-word phrases score higher).
       Single-word matches score 1; multi-word phrases score = number of words.
    3. Only flag a mismatch when:
       - The current category scores 0 (no keywords match at all), AND
       - Another category scores >= 1 (any signal), OR
       - Another category scores strictly more than 2× the current category score.
    """
    name_lower = name.lower()

    # Rule 1: override — if name contains a strong indicator for current category, trust it
    for kw in _CATEGORY_OVERRIDES.get(current_slug, []):
        if kw in name_lower:
            return None  # definitely belongs here

    # Score each category; multi-word phrases get weight = number of words
    scores: dict[str, float] = {}
    for cat_slug, keywords in _CATEGORY_KEYWORDS.items():
        score = sum(len(kw.split()) for kw in keywords if kw in name_lower)
        if score > 0:
            scores[cat_slug] = score

    if not scores:
        return None  # no signal at all → don't flag

    best = max(scores, key=lambda k: scores[k])
    current_score = scores.get(current_slug, 0.0)
    best_score = scores[best]

    # Only flag if best category is different AND signal is strong
    if best == current_slug:
        return None

    # Require strong evidence:
    # - current scores 0 (no keyword matches for current category) AND best has any match, OR
    # - best scores more than 2× current (overwhelming evidence for different category)
    if current_score == 0 and best_score >= 1:
        return best
    if current_score > 0 and best_score > current_score * 2:
        return best

    return None


@router.get("/catalog")
async def catalog_overview(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
):
    """
    Full catalog audit: every category with its products, images, prices, and platform availability.
    Also detects products whose name does not match their assigned category.
    """
    cat_rows = (await db.execute(
        select(Category).order_by(Category.display_order)
    )).scalars().all()

    prod_rows = (await db.execute(
        select(
            Product.id,
            Product.name,
            Product.slug,
            Product.brand,
            Product.unit,
            Product.image_url,
            Product.thumbnail_url,
            Product.is_active,
            Product.is_featured,
            Category.slug.label("category_slug"),
            Category.name.label("category_name"),
        )
        .join(Category, Product.category_id == Category.id, isouter=True)
        .order_by(Category.display_order, Product.name)
    )).all()

    price_rows = (await db.execute(
        select(
            PlatformPrice.product_id,
            Platform.slug.label("platform_slug"),
            Platform.name.label("platform_name"),
            Platform.color_hex,
            func.min(PlatformPrice.price).label("min_price"),
        )
        .join(Platform, PlatformPrice.platform_id == Platform.id)
        .where(PlatformPrice.is_available.is_(True))
        .group_by(PlatformPrice.product_id, Platform.id, Platform.slug, Platform.name, Platform.color_hex)
    )).all()

    prices_by_product: dict[str, list[dict]] = {}
    for pr in price_rows:
        pid = str(pr.product_id)
        prices_by_product.setdefault(pid, []).append({
            "platform_slug": pr.platform_slug,
            "platform_name": pr.platform_name,
            "color_hex": pr.color_hex,
            "price": float(pr.min_price),
        })

    cat_map: dict[str, dict] = {}
    for cat in cat_rows:
        cat_map[cat.slug] = {
            "slug": cat.slug,
            "name": cat.name,
            "icon": cat.icon,
            "is_active": cat.is_active,
            "products": [],
            "product_count": 0,
            "with_image": 0,
            "with_prices": 0,
            "mismatches": 0,
        }

    all_mismatches: list[dict] = []

    for p in prod_rows:
        pid = str(p.id)
        prices = prices_by_product.get(pid, [])
        has_image = bool(p.image_url or p.thumbnail_url)
        has_prices = len(prices) > 0
        current_slug = p.category_slug or ""
        expected_slug = _detect_expected_category(p.name, current_slug)
        mismatch = expected_slug is not None

        product_entry = {
            "id": pid,
            "name": p.name,
            "slug": p.slug,
            "brand": p.brand,
            "unit": p.unit,
            "image_url": p.image_url or p.thumbnail_url,
            "is_active": p.is_active,
            "is_featured": p.is_featured,
            "category_slug": current_slug,
            "category_name": p.category_name,
            "prices": prices,
            "platform_count": len(prices),
            "cheapest_price": min((pr["price"] for pr in prices), default=None),
            "has_image": has_image,
            "has_prices": has_prices,
            "mismatch": mismatch,
            "expected_category": expected_slug,
        }

        if mismatch:
            all_mismatches.append({
                "product_id": pid,
                "product_name": p.name,
                "current_category": current_slug,
                "expected_category": expected_slug,
            })

        if current_slug in cat_map:
            cat_map[current_slug]["products"].append(product_entry)
            cat_map[current_slug]["product_count"] += 1
            if has_image:
                cat_map[current_slug]["with_image"] += 1
            if has_prices:
                cat_map[current_slug]["with_prices"] += 1
            if mismatch:
                cat_map[current_slug]["mismatches"] += 1

    categories = list(cat_map.values())

    return {
        "total_categories": len(categories),
        "total_products": len(prod_rows),
        "total_mismatches": len(all_mismatches),
        "mismatches": all_mismatches,
        "categories": categories,
    }
