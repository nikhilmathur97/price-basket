"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart, Share2, ChevronLeft, Clock, Zap, PackageX,
  CheckCircle2, Plus, Minus, Star,
  Truck, ShieldCheck, Tag, Info, Package,
} from "lucide-react";
import toast from "react-hot-toast";

import { api, trackEvent, extractApiError } from "@/services/api";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import type { ProductWithPrices } from "@/types";

// ── UUID guard ─────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Platform emoji map ─────────────────────────────────────────────────────
const PLATFORM_EMOJI: Record<string, string> = {
  blinkit:   "⚡",
  zepto:     "🚀",
  bigbasket: "🛒",
  instamart: "🛵",
};

// ── Category meta: shelf-life, highlight tags, star rating ─────────────────
const CATEGORY_META: Record<string, {
  shelf: string;
  tags: string[];
  rating: number;
  reviewCount: number;
}> = {
  "fruits-vegetables": {
    shelf: "Best by 3–5 days",
    tags: ["Farm Fresh", "Natural", "No Preservatives"],
    rating: 4.3, reviewCount: 1284,
  },
  "dairy-breakfast": {
    shelf: "Best before 7–15 days",
    tags: ["Pasteurized", "Rich in Protein", "No Added Sugar"],
    rating: 4.5, reviewCount: 3920,
  },
  "snacks-drinks": {
    shelf: "Best before 6 months",
    tags: ["Ready to Eat", "Sealed Pack", "Crispy"],
    rating: 4.2, reviewCount: 8740,
  },
  "bakery": {
    shelf: "Best before 3–7 days",
    tags: ["Freshly Baked", "No Artificial Colour", "Soft & Fresh"],
    rating: 4.1, reviewCount: 2310,
  },
  "staples": {
    shelf: "Best before 12 months",
    tags: ["Premium Quality", "Free of Impurities", "Stone Ground"],
    rating: 4.4, reviewCount: 5621,
  },
  "oils-spices": {
    shelf: "Best before 12 months",
    tags: ["Refined Quality", "Cholesterol Free", "Rich Flavour"],
    rating: 4.3, reviewCount: 3180,
  },
  "household": {
    shelf: "Best before 24 months",
    tags: ["Kills 99.9% Germs", "Powerful Clean", "Eco-Safe"],
    rating: 4.2, reviewCount: 1890,
  },
  "personal-care": {
    shelf: "Best before 24 months",
    tags: ["Dermatologist Tested", "Gentle Formula", "No Parabens"],
    rating: 4.4, reviewCount: 4250,
  },
};

const DEFAULT_META = {
  shelf: "Best before 6 months",
  tags: ["Quality Assured", "Genuine Product"],
  rating: 4.0,
  reviewCount: 500,
};

// ── Star rating component ──────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
      {half === 1 && (
        <div className="relative w-4 h-4 flex-shrink-0">
          <Star className="absolute w-4 h-4 text-surface-200" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="w-4 h-4 text-surface-200" />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { addItem, cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const [selectedPlatformId, setSelectedPlatformId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  // Prevents hydration mismatch: Zustand reads localStorage synchronously before
  // React hydrates, so cart state differs between server HTML and client render.
  // Gate all cart-dependent values on mounted so both sides start identical.
  const [mounted, setMounted] = useState(false);

  const isUUID = UUID_RE.test(id ?? "");

  // Real-time WS subscription for real products (safe no-op for mock)
  useWebSocket(isUUID && id ? [id] : []);

  // ── Mock product lookup (non-UUID IDs) ─────────────────────────────────
  const mockProduct = useMemo(
    () => (!isUUID && id ? MOCK_PRODUCTS.find((p) => p.id === id) ?? null : null),
    [id, isUUID],
  );

  // ── API fetch for real UUID products ──────────────────────────────────
  const { data: apiProduct, isLoading, isError } = useQuery<ProductWithPrices>({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.getProduct(id);
      return data;
    },
    enabled: isUUID,
    staleTime: 60_000,
    retry: 1,
  });

  // Unified product reference
  const product: ProductWithPrices | null = isUUID ? (apiProduct ?? null) : mockProduct;

  // Set mounted after first client render — unlocks cart-state rendering
  useEffect(() => { setMounted(true); }, []);

  // Auto-select cheapest platform on load
  useEffect(() => {
    if (product && !selectedPlatformId) {
      setSelectedPlatformId(
        product.cheapest_platform?.id ?? (product.platform_prices ?? [])[0]?.platform.id,
      );
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cart item for current product ─────────────────────────────────────
  // Only read cart after mount — avoids hydration mismatch with Zustand persist
  const cartItem = mounted ? cart?.items.find((i) => i.product.id === id) : undefined;
  const cartQty  = cartItem?.quantity ?? 0;

  // ── Category meta ──────────────────────────────────────────────────────
  const categorySlug = product?.category?.slug ?? "";
  const meta = CATEGORY_META[categorySlug] ?? DEFAULT_META;

  // ── Price calculations ─────────────────────────────────────────────────
  const allPrices      = product?.platform_prices ?? [];
  const availablePrices = allPrices.filter((p) => p.is_available);
  const cheapestPrice   = availablePrices.length > 0
    ? Math.min(...availablePrices.map((p) => p.price))
    : null;
  const mrp = allPrices
    .map((p) => p.original_price ?? p.price)
    .reduce((max, v) => Math.max(max, v), 0);
  const selectedPrice  = allPrices.find(
    (p) => p.platform.id === selectedPlatformId,
  )?.price ?? cheapestPrice;
  const displayPrice   = selectedPrice ?? cheapestPrice;
  const savingsPercent = mrp > 0 && cheapestPrice != null
    ? Math.round(((mrp - cheapestPrice) / mrp) * 100)
    : 0;
  const inStock = availablePrices.length > 0;

  const sortedPrices = useMemo(
    () => [...(product?.platform_prices ?? [])].sort((a, b) => a.price - b.price),
    [product],
  );

  // ── Add to cart ────────────────────────────────────────────────────────
  async function handleAddToCart() {
    if (!product) return;
    if (!isAuthenticated) {
      toast("Please sign in to add items", { icon: "🔒" });
      router.push("/auth/login");
      return;
    }
    try {
      await addItem(
        product.id,
        qty,
        selectedPlatformId ?? product.cheapest_platform?.id,
      );
      toast.success(
        cartQty > 0 ? `${product.name} quantity updated!` : `${product.name} added to cart!`,
        { duration: 1800 },
      );
      trackEvent({
        event_type: "cart_add",
        product_id: product.id,
        platform_id: selectedPlatformId ?? product.cheapest_platform?.id,
        price_shown: displayPrice ?? undefined,
        cart_item_count: (cart?.items.length ?? 0) + qty,
        referrer_page: "product_detail",
      });
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Could not add to cart"));
    }
  }

  async function handleShare() {
    const url  = window.location.href;
    const text = `Check out ${product?.name} at the best price on PriceBasket!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      }
    } catch {
      // User cancelled share — no-op
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (isUUID && isLoading) return <ProductSkeleton />;

  // ── Not found ──────────────────────────────────────────────────────────
  if ((isUUID && (isError || !apiProduct)) || (!isUUID && !mockProduct)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="text-7xl mb-5">😕</div>
        <h2 className="text-xl font-bold text-surface-900 mb-2">Product not found</h2>
        <p className="text-sm text-surface-500 mb-8">
          This product may have been removed or the link is broken.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600
                     hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  if (!product) return <ProductSkeleton />;

  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-24 md:pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">

        {/* ── Back button ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-surface-400
                     hover:text-brand-600 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* ── Hero card: image + core details ── */}
        <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 mb-4">

          {/* ── Image panel ── */}
          <div
            className="bg-white rounded-3xl border border-surface-100 p-6
                        flex items-center justify-center relative overflow-hidden"
            style={{ minHeight: 270 }}
          >
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={280}
                height={280}
                className="object-contain max-h-56 w-auto mx-auto drop-shadow-lg"
                priority
              />
            ) : (
              <span className="text-8xl select-none">🛒</span>
            )}

            {/* Discount badge */}
            {savingsPercent > 0 && (
              <div className="absolute top-4 left-4 bg-green-500 text-white text-xs
                              font-black px-2.5 py-1 rounded-xl shadow">
                {savingsPercent}% OFF
              </div>
            )}

            {/* Out-of-stock overlay */}
            {!inStock && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-sm
                              flex flex-col items-center justify-center gap-2 rounded-3xl">
                <PackageX className="w-10 h-10 text-surface-400" />
                <p className="font-semibold text-surface-500 text-sm">Currently unavailable</p>
              </div>
            )}
          </div>

          {/* ── Details panel ── */}
          <div className="bg-white rounded-3xl border border-surface-100 p-5 flex flex-col">

            {/* Brand */}
            {product.brand && (
              <p className="text-[11px] font-extrabold text-brand-600 uppercase tracking-widest mb-1">
                {product.brand}
              </p>
            )}

            {/* Product name */}
            <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 leading-tight mb-0.5">
              {product.name}
            </h1>

            {/* Unit / weight */}
            {product.unit && (
              <p className="text-sm text-surface-400 mb-3">{product.unit}</p>
            )}

            {/* Star rating */}
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={meta.rating} />
              <span className="text-sm font-bold text-surface-800">{meta.rating}</span>
              <span className="text-xs text-surface-400">
                ({meta.reviewCount.toLocaleString("en-IN")} ratings)
              </span>
            </div>

            {/* Price block */}
            <div className="flex items-baseline gap-3 mb-0.5">
              <span className="text-3xl font-black text-surface-900">
                ₹{displayPrice}
              </span>
              {mrp > 0 && mrp > (displayPrice ?? 0) && (
                <>
                  <span className="text-base text-surface-400 line-through font-medium">
                    ₹{mrp}
                  </span>
                  <span className="text-sm font-bold text-green-600 bg-green-50
                                   border border-green-100 px-2 py-0.5 rounded-lg">
                    {savingsPercent}% off
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-surface-400 mb-4">
              Inclusive of all taxes · MRP ₹{mrp}
            </p>

            {/* Shelf life / expiry */}
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold
                            text-surface-600 bg-amber-50 border border-amber-100
                            rounded-xl px-3 py-1.5 mb-4 self-start">
              <Package className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              {meta.shelf}
            </div>

            {/* Quality highlight tags */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {meta.tags.map((t) => (
                <span key={t}
                  className="text-[10px] font-bold bg-brand-50 text-brand-700
                             border border-brand-100 px-2.5 py-1 rounded-full">
                  ✓ {t}
                </span>
              ))}
            </div>

            {/* Delivery promise chips */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                {
                  icon: <Zap className="w-4 h-4 text-yellow-500" />,
                  label: "10-min",
                  sub: "delivery",
                  bg: "bg-yellow-50 border-yellow-100",
                },
                {
                  icon: <Truck className="w-4 h-4 text-blue-500" />,
                  label: "Home",
                  sub: "delivery",
                  bg: "bg-blue-50 border-blue-100",
                },
                {
                  icon: <ShieldCheck className="w-4 h-4 text-green-500" />,
                  label: "100%",
                  sub: "genuine",
                  bg: "bg-green-50 border-green-100",
                },
              ].map((chip) => (
                <div key={chip.label}
                  className={`flex flex-col items-center rounded-2xl py-2.5 border ${chip.bg}`}>
                  {chip.icon}
                  <span className="text-[11px] font-extrabold text-surface-800 mt-1">
                    {chip.label}
                  </span>
                  <span className="text-[10px] text-surface-400">{chip.sub}</span>
                </div>
              ))}
            </div>

            {/* Quantity selector */}
            {inStock && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-surface-600">Qty:</span>
                <div className="flex items-center border-2 border-surface-200 rounded-xl
                                overflow-hidden bg-surface-50">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-white
                               text-surface-700 transition active:scale-90"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-black text-surface-900 text-sm select-none">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-white
                               text-surface-700 transition active:scale-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {cartQty > 0 && (
                  <span className="text-xs text-surface-400 font-medium">
                    {cartQty} in cart
                  </span>
                )}
              </div>
            )}

            {/* CTA row */}
            <div className="flex gap-2 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-600
                           hover:bg-brand-700 active:scale-[0.97] text-white font-extrabold
                           py-3 rounded-2xl text-sm transition-all shadow-md
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                {!inStock ? "Out of Stock" : cartQty > 0 ? "Add More" : "Add to Cart"}
              </button>

              <button
                onClick={handleShare}
                className="w-11 h-11 flex items-center justify-center rounded-2xl
                           border-2 border-surface-200 bg-white hover:bg-surface-50
                           text-surface-600 transition active:scale-95 self-center"
                title="Share product"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Platform price comparison ── */}
        <section className="mb-4">
          <h2 className="text-sm font-extrabold text-surface-800 mb-3 flex items-center gap-2 px-1">
            <Tag className="w-4 h-4 text-brand-600" />
            Best Prices Across 4 Platforms
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {sortedPrices.map((pp, idx) => {
              const isCheapest = idx === 0 && pp.price === cheapestPrice;
              const isFastest  = pp.platform.id === product.fastest_platform?.id;
              const isSelected = selectedPlatformId === pp.platform.id;
              const emoji      = PLATFORM_EMOJI[pp.platform.id] ?? "🏪";
              const discPct    = mrp > 0
                ? Math.round(((mrp - pp.price) / mrp) * 100)
                : pp.discount_percent;

              return (
                <button
                  key={pp.platform.id}
                  onClick={() => { setSelectedPlatformId(pp.platform.id); setQty(1); }}
                  disabled={!pp.is_available}
                  className={[
                    "w-full text-left p-4 rounded-2xl border-2 transition-all duration-150",
                    "hover:shadow-lg active:scale-[0.98]",
                    isSelected
                      ? "border-brand-500 bg-gradient-to-br from-brand-50 to-white shadow-md"
                      : "border-surface-100 bg-white hover:border-surface-200",
                    !pp.is_available ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Platform info */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center
                                   text-xl flex-shrink-0"
                        style={{
                          backgroundColor: (pp.platform.color_hex ?? "#e5e7eb") + "30",
                          border: `2px solid ${pp.platform.color_hex ?? "#e5e7eb"}40`,
                        }}
                      >
                        {emoji}
                      </div>
                      <div>
                        <p className="font-extrabold text-surface-900 text-sm leading-tight">
                          {pp.platform.name}
                        </p>
                        <p className="text-[11px] text-surface-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {pp.delivery_time_minutes != null
                            ? `${pp.delivery_time_minutes} min`
                            : `~${pp.platform.avg_delivery_minutes} min`}
                          {pp.platform.free_delivery_threshold != null && (
                            <span className="ml-1">
                              · Free above ₹{pp.platform.free_delivery_threshold}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-surface-900">₹{pp.price}</p>
                      {discPct > 0 && (
                        <p className="text-[11px] font-bold text-green-600">
                          {discPct}% off
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badge row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {isCheapest && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold
                                       bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Best Price
                      </span>
                    )}
                    {isFastest && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold
                                       bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        <Zap className="w-3 h-3" /> Fastest
                      </span>
                    )}
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold
                                       bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                        ✓ Selected
                      </span>
                    )}
                    {!pp.is_available && (
                      <span className="text-[10px] font-semibold text-red-500">Unavailable</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Savings callout ── */}
        {(product.intelligence?.savings_amount ?? 0) > 0 && (
          <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50
                          border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 bg-green-500 rounded-2xl flex items-center
                            justify-center flex-shrink-0 text-xl shadow">
              💰
            </div>
            <div>
              <p className="font-extrabold text-green-800 text-sm">
                Save up to ₹{product.intelligence?.savings_amount} on this product!
              </p>
              <p className="text-xs text-green-600 mt-0.5 leading-relaxed">
                Price varies by {product.intelligence?.price_spread_percent}% across platforms.
                {" "}Best deal on{" "}
                <strong>{product.cheapest_platform?.name ?? "BigBasket"}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ── Product info card ── */}
        <div className="bg-white rounded-3xl border border-surface-100 p-5 mb-4">
          <h2 className="text-sm font-extrabold text-surface-900 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-600" />
            Product Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
            {[
              { label: "Brand",        value: product.brand ?? "Generic" },
              { label: "Net Weight",   value: product.unit ?? "Standard" },
              { label: "Category",     value: product.category?.name ?? "General" },
              { label: "Shelf Life",   value: meta.shelf },
              { label: "Available on", value: `${product.coverage_summary?.available_platform_count ?? allPrices.length} of 4 platforms` },
              { label: "Fastest ETA",  value: product.coverage_summary?.best_eta_minutes
                ? `${product.coverage_summary.best_eta_minutes} min`
                : "~10 min" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-surface-400 font-medium uppercase tracking-wider mb-0.5">
                  {label}
                </p>
                <p className="font-bold text-surface-800 text-sm">{value}</p>
              </div>
            ))}
          </div>

          {product.description && (
            <p className="mt-4 text-sm text-surface-600 leading-relaxed border-t
                          border-surface-100 pt-4">
              {product.description}
            </p>
          )}
        </div>

        {/* ── Why PriceBasket trust strip ── */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { emoji: "⚡", title: "10-min delivery", desc: "Blinkit & Zepto" },
            { emoji: "💰", title: "Lowest price",    desc: "Compared live" },
            { emoji: "🔄", title: "Easy returns",    desc: "No questions asked" },
          ].map((item) => (
            <div key={item.title}
              className="bg-white rounded-2xl border border-surface-100 p-3 text-center">
              <div className="text-xl mb-1">{item.emoji}</div>
              <p className="text-[11px] font-extrabold text-surface-800">{item.title}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom sticky Add to Cart (mobile only) ── */}
        {inStock && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-100
                          px-4 py-3 flex items-center gap-3 md:hidden z-40 shadow-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-surface-400 font-medium truncate">{product.name}</p>
              <p className="text-base font-black text-surface-900">₹{displayPrice}</p>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700
                         text-white font-extrabold py-3 px-5 rounded-2xl text-sm
                         transition-all active:scale-95 shadow-md flex-shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartQty > 0 ? `Add More (${cartQty})` : "Add to Cart"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="skeleton h-4 w-16 rounded mb-5" />
        <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
          <div className="skeleton rounded-3xl" style={{ minHeight: 270 }} />
          <div className="bg-white rounded-3xl border border-surface-100 p-5 space-y-4">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-7 w-3/4 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-9 w-40 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-20 rounded-2xl" />
            <div className="skeleton h-12 rounded-2xl" />
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
