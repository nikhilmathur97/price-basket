"""Re-export all models so Alembic can discover them."""
from app.models.user import User
from app.models.platform import Platform
from app.models.product import Category, Product
from app.models.price import PlatformPrice, PriceHistory, PriceAlert
from app.models.cart import Cart, CartItem, Wishlist, WishlistItem, RefreshToken
from app.models.analytics import UserEvent

__all__ = [
    "User",
    "Platform",
    "Category",
    "Product",
    "PlatformPrice",
    "PriceHistory",
    "PriceAlert",
    "Cart",
    "CartItem",
    "Wishlist",
    "WishlistItem",
    "RefreshToken",
    "UserEvent",
]
