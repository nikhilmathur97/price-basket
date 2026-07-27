"""Re-export all models so Alembic can discover them."""
from app.models.user import User
from app.models.platform import Platform
from app.models.product import Category, Product
from app.models.price import PlatformPrice, PriceHistory, PriceAlert
from app.models.cart import Cart, CartItem, Wishlist, WishlistItem, RefreshToken
from app.models.analytics import UserEvent
from app.models.marketing import (
    MarketingContent,
    MarketingCampaign,
    MarketingAnalytics,
    MarketingGoal,
    MarketingSchedule,
)
from app.models.executive_report import ExecutiveReport
from app.models.competitor_intel import CompetitorInsight
from app.models.review import Review
from app.models.loyalty import (
    ReferralCode,
    ReferralConversion,
    LoyaltyAccount,
    LoyaltyTransaction,
    LoyaltyBadge,
)
from app.models.content_headline_test import HeadlineVariant

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
    "MarketingContent",
    "MarketingCampaign",
    "MarketingAnalytics",
    "MarketingGoal",
    "MarketingSchedule",
    "ExecutiveReport",
    "CompetitorInsight",
    "Review",
    "ReferralCode",
    "ReferralConversion",
    "LoyaltyAccount",
    "LoyaltyTransaction",
    "LoyaltyBadge",
    "HeadlineVariant",
]
