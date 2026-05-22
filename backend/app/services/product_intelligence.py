"""Helpers for deriving canonical product intelligence and affiliate-aware buy links."""
import re
import uuid
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.product import Product


QUANTITY_PATTERN = re.compile(r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>kg|g|gm|l|ml|pcs|pc|pack)", re.IGNORECASE)


@dataclass
class ProductIntelligenceSnapshot:
    normalized_name: str
    normalized_brand: str | None
    quantity_value: float | None
    quantity_unit: str | None
    variant_signature: str
    available_platform_count: int
    total_platform_count: int
    best_price: float | None
    highest_price: float | None
    savings_amount: float
    price_spread_percent: float
    recommendation_reason: str


class ProductIntelligenceService:
    """Computes derived search and comparison metadata from catalog + price data."""

    def build_snapshot(
        self,
        product: Product,
        prices: Iterable[PlatformPrice],
    ) -> ProductIntelligenceSnapshot:
        price_list = list(prices)
        available = [price for price in price_list if price.is_available]
        best_price = float(min((price.price for price in available), default=0) or 0)
        highest_price = float(max((price.price for price in available), default=0) or 0)
        quantity_value, quantity_unit = self._extract_quantity(product)
        normalized_brand = self._normalize_text(product.brand) if product.brand else None
        normalized_name = self._normalize_name(product.name, normalized_brand, quantity_value, quantity_unit)
        variant_signature = self._variant_signature(normalized_brand, normalized_name, quantity_value, quantity_unit)
        savings_amount = round(max(highest_price - best_price, 0), 2) if available else 0.0
        price_spread_percent = round((savings_amount / best_price) * 100, 2) if best_price else 0.0

        return ProductIntelligenceSnapshot(
            normalized_name=normalized_name,
            normalized_brand=normalized_brand,
            quantity_value=quantity_value,
            quantity_unit=quantity_unit,
            variant_signature=variant_signature,
            available_platform_count=len(available),
            total_platform_count=len(price_list),
            best_price=best_price or None,
            highest_price=highest_price or None,
            savings_amount=savings_amount,
            price_spread_percent=price_spread_percent,
            recommendation_reason=self._recommendation_reason(available, best_price, price_spread_percent),
        )

    def build_buy_url(self, product_id: uuid.UUID, platform_id: uuid.UUID) -> str:
        return f"/api/v1/products/{product_id}/buy/{platform_id}"

    def append_affiliate_params(self, url: str, platform: Platform) -> str:
        parsed = urlparse(url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query.update(
            {
                "utm_source": "pricebasket",
                "utm_medium": "affiliate",
                "utm_campaign": "quick-commerce-compare",
                "aff_partner": f"pricebasket-{platform.slug}",
            }
        )
        return urlunparse(parsed._replace(query=urlencode(query)))

    def _extract_quantity(self, product: Product) -> tuple[float | None, str | None]:
        source = product.unit or product.name
        match = QUANTITY_PATTERN.search(source or "")
        if not match:
            return None, None
        value = float(match.group("value"))
        unit = match.group("unit").lower()
        normalized_unit = {
            "gm": "g",
            "pc": "pcs",
        }.get(unit, unit)
        return value, normalized_unit

    def _normalize_name(
        self,
        name: str,
        normalized_brand: str | None,
        quantity_value: float | None,
        quantity_unit: str | None,
    ) -> str:
        normalized = self._normalize_text(name) or ""
        if normalized_brand:
            normalized = normalized.replace(normalized_brand, " ").strip()
        if quantity_value is not None and quantity_unit:
            quantity_token = f"{self._format_quantity(quantity_value)} {quantity_unit}"
            normalized = normalized.replace(quantity_token, " ").strip()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()

    def _variant_signature(
        self,
        normalized_brand: str | None,
        normalized_name: str,
        quantity_value: float | None,
        quantity_unit: str | None,
    ) -> str:
        parts = [normalized_brand or "generic", normalized_name or "item"]
        if quantity_value is not None and quantity_unit:
            parts.append(f"{self._format_quantity(quantity_value)}{quantity_unit}")
        return "::".join(parts)

    def _recommendation_reason(
        self,
        available: list[PlatformPrice],
        best_price: float,
        price_spread_percent: float,
    ) -> str:
        if not available:
            return "No live sellers are currently serviceable for this product."
        fastest_eta = min((price.delivery_time_minutes for price in available if price.delivery_time_minutes), default=None)
        if price_spread_percent >= 10:
            return f"High price spread detected. Buying at the best offer saves up to {price_spread_percent:.0f}% right now."
        if fastest_eta is not None and fastest_eta <= 15:
            return f"Fast local fulfillment available in as little as {fastest_eta} minutes."
        return f"Stable market pricing detected with a current best live price of Rs. {best_price:.2f}."

    def _normalize_text(self, value: str | None) -> str | None:
        if not value:
            return None
        normalized = value.lower().replace("coca cola", "coke")
        normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized or None

    def _format_quantity(self, value: float) -> str:
        return str(int(value)) if value.is_integer() else f"{value:g}"
