"""
Cart API
========
- GET    /cart/           — get active cart
- POST   /cart/items      — add item
- PATCH  /cart/items/{id} — update quantity / platform
- DELETE /cart/items/{id} — remove item
- DELETE /cart/           — clear cart
- GET    /cart/optimize   — optimization strategies
- POST   /cart/checkout   — generate checkout deep-links per platform
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
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
    cart = await _load_cart(db, cart.id)
    return CartOut(
        id=cart.id,
        items=[CartItemOut.model_validate(i) for i in cart.items],
        total_items=sum(i.quantity for i in cart.items),
        created_at=cart.created_at,
        updated_at=cart.updated_at,
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
    """Return platform cost breakdown and optimization suggestions."""
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
