from typing import Optional
"""
User Analytics Event model.

Tracks every meaningful user interaction:
  - product_view      : user opens a product detail page
  - cart_add          : user adds a product to cart
  - cart_remove       : user removes an item from cart
  - platform_redirect : user clicks "Buy on Blinkit/Zepto/BB" → leaves the site
  - search            : user submits a search query
  - checkout_start    : user initiates checkout flow

client_id is a UUID generated once in the browser and persisted in
localStorage as 'pb_client_id'.  It is sent with every event so we can
track anonymous journeys and later stitch them to a user_id on login.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

EVENT_TYPES = (
    "product_view",
    "cart_add",
    "cart_remove",
    "platform_redirect",
    "search",
    "checkout_start",
)


class UserEvent(Base):
    """One row = one user interaction event."""

    __tablename__ = "user_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Event type ────────────────────────────────────────────────────────────
    event_type: Mapped[str] = mapped_column(
        Enum(*EVENT_TYPES, name="user_event_type_enum"),
        nullable=False,
        index=True,
    )

    # ── Identity (at least one must be set) ───────────────────────────────────
    # Registered user (NULL for anonymous)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Browser-persistent UUID (sent from frontend localStorage 'pb_client_id')
    client_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Short-lived browser session
    session_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # ── What was interacted with ──────────────────────────────────────────────
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    platform_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("platforms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Event-specific payload ────────────────────────────────────────────────
    # Price shown to the user at the moment of the event (e.g. redirect price)
    price_shown: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    # Number of items in cart at time of event
    cart_item_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Search term (for 'search' events)
    search_query: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Which page/surface the event originated from
    referrer_page: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # 'home' | 'search' | 'category' | 'product' | 'cart'
    # Deep-link URL the user was redirected to (for platform_redirect events)
    redirect_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Request metadata (privacy-safe) ──────────────────────────────────────
    # Store hashed IP only — never the raw IP
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)  # ISO 3166-1

    # ── Timestamp ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user = relationship("User", foreign_keys=[user_id])
    product = relationship("Product", foreign_keys=[product_id])
    platform = relationship("Platform", foreign_keys=[platform_id])

    def __repr__(self) -> str:
        return (
            f"<UserEvent type={self.event_type} "
            f"client={self.client_id} product={self.product_id}>"
        )
