"""
Cart Optimizer
==============
Given a cart (list of items with per-platform prices), compute:

  1. cheapest_single   — buy everything from the cheapest single platform
  2. fastest_single    — buy everything from the fastest single platform
  3. cheapest_split    — each item from its individually cheapest source
  4. best_value_split  — weighted cost + delivery time optimisation

Delivery fees and minimum order thresholds are respected.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from uuid import UUID

import structlog

log = structlog.get_logger(__name__)


@dataclass
class CartItemPriceInfo:
    product_id: str
    product_name: str
    quantity: int
    platform_prices: Dict[str, "PlatformPriceInfo"]  # slug → info


@dataclass
class PlatformPriceInfo:
    platform_id: str
    platform_slug: str
    platform_name: str
    platform_color: str
    price: float
    is_available: bool
    delivery_time_minutes: int
    delivery_fee: float
    free_delivery_threshold: float
    platform_product_url: Optional[str]


@dataclass
class PlatformBundle:
    platform_id: str
    platform_slug: str
    platform_name: str
    platform_color: str
    items: List[Dict[str, Any]] = field(default_factory=list)
    subtotal: float = 0.0
    delivery_fee: float = 0.0
    total: float = 0.0
    estimated_delivery_minutes: int = 0


@dataclass
class OptimizationResult:
    cheapest_single: Optional[PlatformBundle] = None
    fastest_single: Optional[PlatformBundle] = None
    cheapest_split: List[PlatformBundle] = field(default_factory=list)
    best_value_split: List[PlatformBundle] = field(default_factory=list)
    savings_vs_most_expensive: float = 0.0
    split_savings_vs_cheapest_single: float = 0.0


class CartOptimizer:
    """Pure computation class — no DB calls."""

    def optimize(self, items: List[CartItemPriceInfo]) -> OptimizationResult:
        if not items:
            return OptimizationResult()

        all_slugs = self._all_platform_slugs(items)

        # ── Single-platform totals ────────────────────────────────────────────
        platform_totals: Dict[str, PlatformBundle] = {}
        for slug in all_slugs:
            bundle = self._build_single_platform_bundle(slug, items)
            if bundle:
                platform_totals[slug] = bundle

        if not platform_totals:
            return OptimizationResult()

        available_bundles = list(platform_totals.values())

        # Only consider platforms where ALL items are available
        fully_available = [b for b in available_bundles if len(b.items) == len(items)]

        cheapest_single = min(fully_available, key=lambda b: b.total) if fully_available else \
            min(available_bundles, key=lambda b: b.total)

        fastest_single = min(
            [b for b in (fully_available or available_bundles) if b.estimated_delivery_minutes > 0],
            key=lambda b: b.estimated_delivery_minutes,
            default=cheapest_single,
        )

        most_expensive_total = max(b.total for b in available_bundles)

        # ── Split strategies ──────────────────────────────────────────────────
        cheapest_split_map: Dict[str, PlatformBundle] = {}
        for item in items:
            best_slug = self._cheapest_for_item(item)
            if best_slug:
                cheapest_split_map.setdefault(best_slug, self._empty_bundle(platform_totals, best_slug))
                self._add_item_to_bundle(cheapest_split_map[best_slug], item, best_slug)

        for bundle in cheapest_split_map.values():
            bundle.delivery_fee = self._calc_delivery_fee_from_bundle(bundle, platform_totals)
            bundle.total = bundle.subtotal + bundle.delivery_fee

        best_value_split_map: Dict[str, PlatformBundle] = {}
        for item in items:
            best_slug = self._best_value_for_item(item)
            if best_slug:
                best_value_split_map.setdefault(best_slug, self._empty_bundle(platform_totals, best_slug))
                self._add_item_to_bundle(best_value_split_map[best_slug], item, best_slug)

        for bundle in best_value_split_map.values():
            bundle.delivery_fee = self._calc_delivery_fee_from_bundle(bundle, platform_totals)
            bundle.total = bundle.subtotal + bundle.delivery_fee

        cheapest_split_total = sum(b.total for b in cheapest_split_map.values())
        split_savings = cheapest_single.total - cheapest_split_total

        return OptimizationResult(
            cheapest_single=cheapest_single,
            fastest_single=fastest_single,
            cheapest_split=list(cheapest_split_map.values()),
            best_value_split=list(best_value_split_map.values()),
            savings_vs_most_expensive=round(most_expensive_total - cheapest_single.total, 2),
            split_savings_vs_cheapest_single=round(split_savings, 2),
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _all_platform_slugs(self, items: List[CartItemPriceInfo]) -> List[str]:
        slugs: set[str] = set()
        for item in items:
            slugs.update(item.platform_prices.keys())
        return list(slugs)

    def _build_single_platform_bundle(
        self, slug: str, items: List[CartItemPriceInfo]
    ) -> Optional[PlatformBundle]:
        first_info: Optional[PlatformPriceInfo] = None
        for item in items:
            info = item.platform_prices.get(slug)
            if info:
                first_info = info
                break
        if not first_info:
            return None

        bundle = PlatformBundle(
            platform_id=first_info.platform_id,
            platform_slug=slug,
            platform_name=first_info.platform_name,
            platform_color=first_info.platform_color,
        )
        for item in items:
            info = item.platform_prices.get(slug)
            if info and info.is_available:
                self._add_item_to_bundle(bundle, item, slug)

        delivery_ref = first_info
        bundle.delivery_fee = (
            0.0 if bundle.subtotal >= delivery_ref.free_delivery_threshold
            else delivery_ref.delivery_fee
        )
        bundle.total = round(bundle.subtotal + bundle.delivery_fee, 2)
        bundle.estimated_delivery_minutes = first_info.delivery_time_minutes
        return bundle

    def _add_item_to_bundle(
        self, bundle: PlatformBundle, item: CartItemPriceInfo, slug: str
    ) -> None:
        info = item.platform_prices.get(slug)
        if not info:
            return
        line_total = round(info.price * item.quantity, 2)
        bundle.subtotal = round(bundle.subtotal + line_total, 2)
        bundle.estimated_delivery_minutes = max(
            bundle.estimated_delivery_minutes, info.delivery_time_minutes or 0
        )
        bundle.items.append({
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "unit_price": info.price,
            "line_total": line_total,
            "platform_product_url": info.platform_product_url,
        })

    def _cheapest_for_item(self, item: CartItemPriceInfo) -> Optional[str]:
        available = {
            slug: info
            for slug, info in item.platform_prices.items()
            if info.is_available
        }
        if not available:
            return None
        return min(available, key=lambda s: available[s].price)

    def _best_value_for_item(self, item: CartItemPriceInfo) -> Optional[str]:
        available = {
            slug: info
            for slug, info in item.platform_prices.items()
            if info.is_available
        }
        if not available:
            return None
        prices = [i.price for i in available.values()]
        times = [i.delivery_time_minutes or 60 for i in available.values()]
        min_p, max_p = min(prices), max(prices) or 1
        min_t, max_t = min(times), max(times) or 1

        def score(info: PlatformPriceInfo) -> float:
            np_ = (info.price - min_p) / (max_p - min_p + 1e-9)
            nt = ((info.delivery_time_minutes or 60) - min_t) / (max_t - min_t + 1e-9)
            return 0.7 * np_ + 0.3 * nt

        return min(available, key=lambda s: score(available[s]))

    def _empty_bundle(
        self, platform_totals: Dict[str, PlatformBundle], slug: str
    ) -> PlatformBundle:
        ref = platform_totals.get(slug)
        if ref:
            return PlatformBundle(
                platform_id=ref.platform_id,
                platform_slug=ref.platform_slug,
                platform_name=ref.platform_name,
                platform_color=ref.platform_color,
            )
        return PlatformBundle(platform_id="", platform_slug=slug, platform_name=slug, platform_color="#333")

    def _calc_delivery_fee_from_bundle(
        self, bundle: PlatformBundle, platform_totals: Dict[str, PlatformBundle]
    ) -> float:
        ref = platform_totals.get(bundle.platform_slug)
        if not ref or not ref.items:
            return 0.0
        # Get delivery fee from first item's info
        first_item = bundle.items[0] if bundle.items else None
        if not first_item:
            return 0.0
        # Use the delivery fee from the full bundle calculation
        return ref.delivery_fee if bundle.subtotal < ref.subtotal else 0.0
