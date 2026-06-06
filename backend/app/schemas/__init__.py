"""Pydantic schemas for auth, users, products, cart, and prices."""
import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ═════════════════════════════════════════════════════════════════════════════
#  Auth
# ═════════════════════════════════════════════════════════════════════════════

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def _strong_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strong_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: Optional["UserOut"] = None  # included on login/register — saves a round-trip /me call


class RefreshRequest(BaseModel):
    refresh_token: str


# ═════════════════════════════════════════════════════════════════════════════
#  Users
# ═════════════════════════════════════════════════════════════════════════════

class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    city: Optional[str]
    pincode: Optional[str]
    is_admin: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notification_email: Optional[bool] = None
    notification_push: Optional[bool] = None


class FCMTokenIn(BaseModel):
    """Device push-notification token sent by the mobile app."""
    token: str = Field(..., min_length=1, max_length=4096)


# ═════════════════════════════════════════════════════════════════════════════
#  Platform
# ═════════════════════════════════════════════════════════════════════════════

class PlatformOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    slug: str
    name: str
    logo_url: Optional[str]
    color_hex: Optional[str]
    avg_delivery_minutes: int
    min_order_amount: float
    delivery_fee: float
    free_delivery_threshold: Optional[float]
    is_active: bool


# ═════════════════════════════════════════════════════════════════════════════
#  Products
# ═════════════════════════════════════════════════════════════════════════════

class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    slug: str
    name: str
    icon: Optional[str]
    image_url: Optional[str]
    display_order: int


class PlatformPriceOut(BaseModel):
    model_config = {"from_attributes": True}

    platform: PlatformOut
    price: float
    original_price: Optional[float]
    discount_percent: float
    discount_label: Optional[str]
    is_available: bool
    delivery_time_minutes: Optional[int]
    platform_product_url: Optional[str]
    platform_image_url: Optional[str] = None
    buy_url: Optional[str] = None
    last_updated: datetime
    source: Optional[str] = None   # "scrape" | "estimated" | "cache" | None


class ProductOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    slug: str
    name: str
    brand: Optional[str]
    description: Optional[str]
    image_url: Optional[str]
    thumbnail_url: Optional[str]
    unit: Optional[str]
    category: Optional[CategoryOut]
    tags: Optional[List[str]]
    is_featured: bool


class ProductIntelligenceOut(BaseModel):
    normalized_name: str
    normalized_brand: Optional[str]
    quantity_value: Optional[float]
    quantity_unit: Optional[str]
    variant_signature: str
    available_platform_count: int
    total_platform_count: int
    best_price: Optional[float]
    highest_price: Optional[float]
    savings_amount: float
    price_spread_percent: float
    recommendation_reason: str


class CoverageSummaryOut(BaseModel):
    available_platform_count: int
    total_platform_count: int
    best_eta_minutes: Optional[int]
    average_eta_minutes: Optional[int]
    live_offer_count: int


class ProductWithPrices(ProductOut):
    """Product enriched with real-time cross-platform prices."""
    platform_prices: List[PlatformPriceOut] = []
    cheapest_platform: Optional[PlatformOut] = None
    fastest_platform: Optional[PlatformOut] = None
    best_value_platform: Optional[PlatformOut] = None
    intelligence: ProductIntelligenceOut
    coverage_summary: CoverageSummaryOut
    affiliate_enabled: bool = True


class ProductSearchResult(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProductWithPrices]


# ═════════════════════════════════════════════════════════════════════════════
#  Cart
# ═════════════════════════════════════════════════════════════════════════════

class CartItemAdd(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=100)
    selected_platform_id: Optional[uuid.UUID] = None


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0, le=100)
    selected_platform_id: Optional[uuid.UUID] = None


class CartItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    product: ProductOut
    selected_platform: Optional[PlatformOut]
    quantity: int
    snapshot_price: Optional[float]
    added_at: datetime


class CartOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    items: List[CartItemOut]
    total_items: int
    created_at: datetime
    updated_at: datetime


# ═════════════════════════════════════════════════════════════════════════════
#  Cart Optimizer
# ═════════════════════════════════════════════════════════════════════════════

class PlatformCartBreakdown(BaseModel):
    platform: PlatformOut
    items: List[dict[str, Any]]
    subtotal: float
    delivery_fee: float
    total: float
    estimated_delivery_minutes: int


class CartOptimizationResult(BaseModel):
    """Three optimized cart strategies for the user to choose from."""
    cheapest_single_platform: PlatformCartBreakdown
    fastest_single_platform: PlatformCartBreakdown
    cheapest_split: List[PlatformCartBreakdown]
    best_value_split: List[PlatformCartBreakdown]
    savings_vs_most_expensive: float
    split_savings_vs_cheapest_single: float


# ═════════════════════════════════════════════════════════════════════════════
#  Price Alerts
# ═════════════════════════════════════════════════════════════════════════════

class PriceAlertCreate(BaseModel):
    product_id: uuid.UUID
    target_price: float = Field(gt=0)


class PriceAlertOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    product: ProductOut
    target_price: float
    is_active: bool
    triggered_at: Optional[datetime]
    created_at: datetime


# ═════════════════════════════════════════════════════════════════════════════
#  Pagination helper
# ═════════════════════════════════════════════════════════════════════════════

class PaginatedResponse(BaseModel):
    total: int
    page: int = 1
    page_size: int = 20
    has_next: bool
    has_prev: bool

