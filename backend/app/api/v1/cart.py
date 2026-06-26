"""
Cart API
========
- GET    /cart/           — get active cart
- POST   /cart/items      — add item
- PATCH  /cart/items/{id} — update quantity / platform
- DELETE /cart/items/{id} — remove item
- DELETE /cart/           — clear cart
- GET    /cart/optimize   — optimization strategies (session-based)
- POST   /cart/optimize   — optimization strategies (stateless, guest-friendly)
- POST   /cart/checkout   — generate checkout deep-links per platform
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user, get_optional_user
from app.models.cart import Cart, CartItem
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Product
from app.models.user import User
from app.schemas import CartItemAdd, CartItemOut, CartItemUpdate, CartOut, CartOptimizationResult
from app.services.cart_optimizer import (
    CartItemPriceInfo,
    CartOptimizer,
    PlatformPriceInfo,
)

router = APIRouter()


# ── Request / Response models for stateless POST /optimize ───────────────────

class OptimizeCartItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1


class OptimizeCartRequest(BaseModel):
    items: List[OptimizeCartItemIn]


class OptimizePlatformItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    line_total: float
    platform_product_url: Optional[str] = None


class OptimizePlatformOut(BaseModel):
    platform_slug: str
    platform_name: str
    platform_color: str
    items: List[OptimizePlatformItem]
    subtotal: float
    delivery_fee: float
    total: float
    platform_url: str
    item_count: int


class OptimizeCartResponse(BaseModel):
    original_total: float
    optimized_total: float
    savings: float
    savings_percent: float
    recommendation: str          # "split" | "single"
    platforms: List[OptimizePlatformOut]
    message: str


# ── Platform home URLs ────────────────────────────────────────────────────────
_PLATFORM_HOME: dict[str, str] = {
    "blinkit":   "https://blinkit.com",
    "zepto":     "https://www.zeptonow.com",
    "instamart": "https://www.swiggy.com/instamart",
    "bigbasket": "https://www.bigbasket.com",
    "flipkart":  "https://www.flipkart.com",
    "amazon":    "https://www.amazon.in",
    "jiomart":   "https://www.jiomart.com",
    "nykaa":     "https://www.nykaa.com",
    "myntra":    "https://www.myntra.com",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_cart(
    db: AsyncSession,
    user: Optional[User],
    session_id: Optional[str],
) -> Cart:
    if user:
        result = await db.execute(
            select(Cart)
            .where(Cart.user_id == user.id, Cart.is_active == True)  # noqa: E712
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .options(selectinload(Cart.items).selectinload(CartItem.selected_platform))
        )
        cart = result.scalar_one_or_none()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            await db.flush()
    else:
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id required for guest cart")
        result = await db.execute(
            select(Cart)
            .where(Cart.session_id == session_id, Cart.is_active == True)  # noqa: E712
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .options(selectinload(Cart.items).selectinload(CartItem.selected_platform))
        )
        cart = result.scalar_one_or_none()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            await db.flush()
    return cart


async def _load_cart(db: AsyncSession, cart_id: uuid.UUID) -> Cart:
    result = await db.execute(
        select(Cart)
        .where(Cart.id == cart_id)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.product)
            .selectinload(Product.category),
            selectinload(Cart.items).selectinload(CartItem.selected_platform),
        )
    )
    return result.scalar_one_or_none()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=CartOut)
async def get_cart(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session_id = request.headers.get("X-Session-ID")
    cart = await _get_or_create_cart(db, current_user, session_id)
    cart = await _load_cart(db, cart.id)
    return CartOut(
        id=cart.id,
        items=[CartItemOut.model_validate(i) for i in cart.items],
        total_items=sum(i.quantity for i in cart.items),
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
async def add_item(
    body: CartItemAdd,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session_id = request.headers.get("X-Session-ID")
    cart = await _get_or_create_cart(db, current_user, session_id)

    # Validate product exists
    product = await db.get(Product, body.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if item already in cart — increment qty instead
    result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_id == body.product_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.quantity = min(existing.quantity + body.quantity, 100)
        if body.selected_platform_id:
            existing.selected_platform_id = body.selected_platform_id
    else:
        # Snapshot the cheapest current price
        price_result = await db.execute(
            select(PlatformPrice)
            .where(PlatformPrice.product_id == body.product_id, PlatformPrice.is_available == True)  # noqa
            .order_by(PlatformPrice.price)
            .limit(1)
        )
        best_price = price_result.scalar_one_or_none()

        item = CartItem(
            cart_id=cart.id,
            product_id=body.product_id,
            quantity=body.quantity,
            selected_platform_id=body.selected_platform_id,
            snapshot_price=float(best_price.price) if best_price else None,
        )
        db.add(item)

    await db.flush()
    # Query items directly to bypass identity-map cache — the Cart.items collection
    # loaded earlier by _get_or_create_cart doesn't reflect the new/updated item.
    items_result = await db.execute(
        select(CartItem)
        .where(CartItem.cart_id == cart.id)
        .options(
            selectinload(CartItem.product).selectinload(Product.category),
            selectinload(CartItem.selected_platform),
        )
    )
    items = items_result.scalars().all()
    cart_row = (await db.execute(select(Cart).where(Cart.id == cart.id))).scalar_one()
    return CartOut(
        id=cart_row.id,
        items=[CartItemOut.model_validate(i) for i in items],
        total_items=sum(i.quantity for i in items),
        created_at=cart_row.created_at,
        updated_at=cart_row.updated_at,
    )


@router.patch("/items/{item_id}", response_model=CartOut)
async def update_item(
    item_id: uuid.UUID,
    body: CartItemUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session_id = request.headers.get("X-Session-ID")
    cart = await _get_or_create_cart(db, current_user, session_id)

    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if body.quantity == 0:
        await db.delete(item)
    else:
        item.quantity = body.quantity
        if body.selected_platform_id is not None:
            item.selected_platform_id = body.selected_platform_id

    await db.flush()
    cart = await _load_cart(db, cart.id)
    return CartOut(
        id=cart.id,
        items=[CartItemOut.model_validate(i) for i in cart.items],
        total_items=sum(i.quantity for i in cart.items),
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    item_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session_id = request.headers.get("X-Session-ID")
    cart = await _get_or_create_cart(db, current_user, session_id)

    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    await db.delete(item)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session_id = request.headers.get("X-Session-ID")
    cart = await _get_or_create_cart(db, current_user, session_id)
    result = await db.execute(select(CartItem).where(CartItem.cart_id == cart.id))
    for item in result.scalars():
        await db.delete(item)


@router.get("/optimize")
async def optimize_cart(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Return platform cost breakdown and optimization suggestions (session-based)."""
    session_id = request.headers.get("X-Session-ID")
    cart = await _get_or_create_cart(db, current_user, session_id)
    cart = await _load_cart(db, cart.id)

    if not cart.items:
        return {"strategies": [], "message": "Cart is empty"}

    # Load all platform prices for cart products
    product_ids = [i.product_id for i in cart.items]
    price_result = await db.execute(
        select(PlatformPrice)
        .where(PlatformPrice.product_id.in_(product_ids))
        .options(selectinload(PlatformPrice.platform))
    )
    all_prices = price_result.scalars().all()

    # Build CartItemPriceInfo objects
    item_info_list: list[CartItemPriceInfo] = []
    for cart_item in cart.items:
        platform_map = {}
        for pp in all_prices:
            if pp.product_id == cart_item.product_id:
                platform_map[pp.platform.slug] = PlatformPriceInfo(
                    platform_id=str(pp.platform.id),
                    platform_slug=pp.platform.slug,
                    platform_name=pp.platform.name,
                    platform_color=pp.platform.color_hex or "#333",
                    price=float(pp.price),
                    is_available=pp.is_available,
                    delivery_time_minutes=pp.delivery_time_minutes or pp.platform.avg_delivery_minutes,
                    delivery_fee=pp.platform.delivery_fee,
                    free_delivery_threshold=pp.platform.free_delivery_threshold or 0,
                    platform_product_url=pp.platform_product_url,
                )
        item_info_list.append(
            CartItemPriceInfo(
                product_id=str(cart_item.product_id),
                product_name=cart_item.product.name,
                quantity=cart_item.quantity,
                platform_prices=platform_map,
            )
        )

    optimizer = CartOptimizer()
    result = optimizer.optimize(item_info_list)
    return result


@router.post("/optimize", response_model=OptimizeCartResponse)
async def optimize_cart_stateless(
    body: OptimizeCartRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Stateless cart optimization — no auth required, works for guests.
    Accepts a list of {product_id, quantity} and returns the cheapest split
    recommendation with per-platform totals and deep-link URLs.
    """
    if not body.items:
        raise HTTPException(status_code=400, detail="items must not be empty")

    product_ids = [item.product_id for item in body.items]
    qty_map: dict[uuid.UUID, int] = {item.product_id: item.quantity for item in body.items}

    # Load products
    product_result = await db.execute(
        select(Product).where(Product.id.in_(product_ids))
    )
    products = {p.id: p for p in product_result.scalars().all()}

    # Load all platform prices for these products
    price_result = await db.execute(
        select(PlatformPrice)
        .where(
            PlatformPrice.product_id.in_(product_ids),
            PlatformPrice.is_available == True,  # noqa: E712
        )
        .options(selectinload(PlatformPrice.platform))
    )
    all_prices = price_result.scalars().all()

    if not all_prices:
        raise HTTPException(status_code=404, detail="No prices found for the given products")

    # Build CartItemPriceInfo list
    item_info_list: list[CartItemPriceInfo] = []
    for pid in product_ids:
        product = products.get(pid)
        if not product:
            continue
        platform_map: dict[str, PlatformPriceInfo] = {}
        for pp in all_prices:
            if pp.product_id == pid:
                platform_map[pp.platform.slug] = PlatformPriceInfo(
                    platform_id=str(pp.platform.id),
                    platform_slug=pp.platform.slug,
                    platform_name=pp.platform.name,
                    platform_color=pp.platform.color_hex or "#333",
                    price=float(pp.price),
                    is_available=pp.is_available,
                    delivery_time_minutes=pp.delivery_time_minutes or pp.platform.avg_delivery_minutes,
                    delivery_fee=float(pp.platform.delivery_fee or 0),
                    free_delivery_threshold=float(pp.platform.free_delivery_threshold or 0),
                    platform_product_url=pp.platform_product_url,
                )
        item_info_list.append(
            CartItemPriceInfo(
                product_id=str(pid),
                product_name=product.name,
                quantity=qty_map[pid],
                platform_prices=platform_map,
            )
        )

    optimizer = CartOptimizer()
    opt = optimizer.optimize(item_info_list)

    # ── Compute original_total: cheapest single-platform total ────────────────
    cheapest = opt.cheapest_single
    original_total = round(
        sum(
            min(
                (info.price for info in item.platform_prices.values() if info.is_available),
                default=0.0,
            ) * item.quantity
            for item in item_info_list
        ),
        2,
    )

    # ── Decide recommendation: split vs single ────────────────────────────────
    split_total = round(sum(b.total for b in opt.cheapest_split), 2)
    single_total = round(cheapest.total if cheapest else original_total, 2)

    if opt.cheapest_split and split_total < single_total:
        recommendation = "split"
        optimized_total = split_total
        bundles = opt.cheapest_split
    else:
        recommendation = "single"
        optimized_total = single_total
        bundles = [cheapest] if cheapest else []

    savings = round(original_total - optimized_total, 2)
    savings_percent = round((savings / original_total * 100) if original_total > 0 else 0.0, 1)

    # ── Build platform output list ────────────────────────────────────────────
    platforms_out: list[OptimizePlatformOut] = []
    for bundle in bundles:
        if not bundle:
            continue
        platforms_out.append(OptimizePlatformOut(
            platform_slug=bundle.platform_slug,
            platform_name=bundle.platform_name,
            platform_color=bundle.platform_color,
            items=[
                OptimizePlatformItem(
                    product_id=it["product_id"],
                    product_name=it["product_name"],
                    quantity=it["quantity"],
                    unit_price=it["unit_price"],
                    line_total=it["line_total"],
                    platform_product_url=it.get("platform_product_url"),
                )
                for it in bundle.items
            ],
            subtotal=round(bundle.subtotal, 2),
            delivery_fee=round(bundle.delivery_fee, 2),
            total=round(bundle.total, 2),
            platform_url=_PLATFORM_HOME.get(bundle.platform_slug, "https://google.com"),
            item_count=len(bundle.items),
        ))

    # ── Build human-readable message ──────────────────────────────────────────
    if recommendation == "split" and len(platforms_out) > 1:
        parts = [f"{p.item_count} item{'s' if p.item_count != 1 else ''} from {p.platform_name}" for p in platforms_out]
        message = "Buy " + " and ".join(parts) + f" to save ₹{savings:.0f}"
    elif platforms_out:
        message = f"Best to buy all from {platforms_out[0].platform_name}" + (
            f" and save ₹{savings:.0f}" if savings > 0 else ""
        )
    else:
        message = "No optimization available"

    return OptimizeCartResponse(
        original_total=original_total,
        optimized_total=optimized_total,
        savings=savings,
        savings_percent=savings_percent,
        recommendation=recommendation,
        platforms=platforms_out,
        message=message,
    )
