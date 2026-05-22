"""Admin API — platform management, product creation, price monitoring."""
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.cart import Cart, CartItem
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Category, Product
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


@router.get("/logins/daily")
async def daily_logins(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin),
    days: int = Query(default=7, ge=1, le=60),
):
    since = datetime.now(UTC) - timedelta(days=days)

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
            .where(User.last_login_at >= (datetime.now(UTC) - timedelta(days=1)))
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
