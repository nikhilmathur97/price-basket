"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";  // still used for cart-all-prices
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import type { ProductWithPrices, CartItem, PlatformPrice } from "@/types";
import { ShoppingBag, ExternalLink, Clock, ArrowRight, Minus, Plus, Zap, CalendarClock } from "lucide-react";
import { PlatformLogo } from "@/components/PlatformLogo";
import toast from "react-hot-toast";

// ── Platform config — all 10 platforms ───────────────────────────────────────
const PLATFORM_META: Record<string, {
  color: string;
  textColor: string;
  homeUrl: string;
  searchUrl: (q: string) => string;
}> = {
  blinkit:   { color: "#0C831F", textColor: "#ffffff", homeUrl: "https://blinkit.com",                  searchUrl: (q) => `https://blinkit.com/search?q=${encodeURIComponent(q)}` },
  zepto:     { color: "#8025FB", textColor: "#ffffff", homeUrl: "https://www.zeptonow.com",              searchUrl: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}` },
  instamart: { color: "#FC8019", textColor: "#ffffff", homeUrl: "https://www.swiggy.com/instamart",      searchUrl: (q) => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}` },
  bigbasket: { color: "#84C225", textColor: "#1a1a1a", homeUrl: "https://www.bigbasket.com",             searchUrl: (q) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(q)}` },
  flipkart:  { color: "#2874F0", textColor: "#ffffff", homeUrl: "https://www.flipkart.com",              searchUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
  amazon:    { color: "#FF9900", textColor: "#1a1a1a", homeUrl: "https://www.amazon.in",                 searchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  jiomart:   { color: "#0046D5", textColor: "#ffffff", homeUrl: "https://www.jiomart.com",               searchUrl: (q) => `https://www.jiomart.com/search#query=${encodeURIComponent(q)}` },
  dunzo:     { color: "#00D290", textColor: "#1a1a1a", homeUrl: "https://www.dunzo.com",                 searchUrl: (q) => `https://www.dunzo.com/search?q=${encodeURIComponent(q)}` },
};

// ── Branded logo container ────────────────────────────────────────────────────
function PlatformLogoBox({
  slug, name, colorHex, size,
}: { slug: string; name: string; colorHex?: string | null; size: number }) {
  const hex = colorHex ?? PLATFORM_META[slug]?.color ?? "#888";
  return (
    <div
      className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 px-1"
      style={{
        minWidth: size + 8,
        maxWidth: (size + 8) * 3,
        height: size + 8,
        backgroundColor: hex + "20",
        border: `1.5px solid ${hex}45`,
      }}
    >
      <PlatformLogo slug={slug} name={name} colorHex={colorHex} size={size} />
    </div>
  );
}

// ── Per-item platform price grid ──────────────────────────────────────────────
function ItemPlatformPrices({
  productName,
  platformPrices,
}: {
  productName: string;
  platformPrices: PlatformPrice[];
}) {
  const sorted = [...platformPrices].sort((a, b) => a.price - b.price);
  const cheapestId = sorted[0]?.platform.id;

  return (
    <div className="px-4 pb-4 border-t border-surface-50 pt-3">
      <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2.5">
        Price on all platforms
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sorted.map((pp) => {
          const meta = PLATFORM_META[pp.platform.slug];
          const isCheapest = pp.platform.id === cheapestId;
          const href = meta?.searchUrl(productName) ?? `https://www.google.com/search?q=${encodeURIComponent(pp.platform.name + " " + productName)}`;

          return (
            <a
              key={pp.platform.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative flex flex-col gap-1.5 rounded-xl p-3 border-2 transition-all duration-200 hover:shadow-lg group ${
                isCheapest
                  ? "border-brand-400 bg-brand-50"
                  : "border-surface-100 bg-white hover:border-surface-200"
              }`}
            >
              {/* Best price label */}
              {isCheapest && (
                <span className="absolute -top-2.5 left-2 text-[9px] font-black bg-brand-500 text-white px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap">
                  BEST PRICE
                </span>
              )}

              {/* Platform name row */}
              <div className="flex items-center gap-1.5">
                <PlatformLogoBox
                  slug={pp.platform.slug}
                  name={pp.platform.name}
                  colorHex={pp.platform.color_hex}
                  size={18}
                />
                <span className="text-xs font-bold text-surface-800 truncate flex-1">
                  {pp.platform.name}
                </span>
                <ExternalLink className="w-2.5 h-2.5 text-surface-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-surface-900">
                  ₹{pp.price}
                </span>
                {pp.original_price && pp.original_price > pp.price && (
                  <span className="text-[10px] text-surface-400 line-through">
                    ₹{pp.original_price}
                  </span>
                )}
              </div>

              {/* Delivery time */}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-surface-400" />
                <span className="text-[11px] text-surface-500 font-medium">
                  {pp.delivery_time_minutes ?? pp.platform.avg_delivery_minutes} min
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Cart Item Row ─────────────────────────────────────────────────────────────
function CartItemRow({ item, platformPrices }: { item: CartItem; platformPrices: PlatformPrice[] }) {
  const { updateItem, removeItem } = useCartStore();

  async function handleQty(delta: number) {
    const next = item.quantity + delta;
    try {
      if (next <= 0) await removeItem(item.id);
      else await updateItem(item.id, next);
    } catch {
      toast.error("Update failed");
    }
  }

  const imgSrc = item.product.thumbnail_url ?? item.product.image_url ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden"
    >
      {/* Product + qty */}
      <div className="flex gap-3 p-4 items-start">
        <div className="w-16 h-16 bg-surface-50 rounded-xl flex-shrink-0 border overflow-hidden">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={item.product.name}
              width={64}
              height={64}
              className="object-contain w-full h-full p-1"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {item.product.brand && (
            <p className="text-xs text-surface-400 truncate">{item.product.brand}</p>
          )}
          <p className="text-sm font-semibold text-surface-900 line-clamp-2 leading-snug">
            {item.product.name}
          </p>
          {item.product.unit && (
            <p className="text-xs text-surface-400">{item.product.unit}</p>
          )}
          {item.snapshot_price && (
            <p className="text-xs text-surface-400 mt-0.5">
              ₹{item.snapshot_price} each
            </p>
          )}
        </div>

        {/* Qty pill */}
        <div className="flex items-center bg-brand-600 rounded-xl overflow-hidden h-8 flex-shrink-0">
          <button
            onClick={() => handleQty(-1)}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-brand-700 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-white font-bold text-sm w-6 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => handleQty(1)}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Platform price comparison */}
      {platformPrices.length > 0 && (
        <ItemPlatformPrices
          productName={item.product.name}
          platformPrices={platformPrices}
        />
      )}
    </motion.div>
  );
}

// ── Platform total summary card (sidebar) ─────────────────────────────────────
function PlatformTotalCard({
  slug,
  name,
  color,
  subtotal,
  deliveryFee,
  avgDelivery,
  isCheapest,
  isFastest,
}: {
  slug: string;
  name: string;
  color: string;
  subtotal: number;
  deliveryFee: number;
  avgDelivery: number;
  isCheapest: boolean;
  isFastest: boolean;
}) {
  const meta = PLATFORM_META[slug];
  const grandTotal = subtotal + deliveryFee;

  return (
    <motion.a
      href={meta?.homeUrl ?? `https://www.google.com/search?q=${encodeURIComponent(name)}`}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`block rounded-2xl border-2 p-4 transition-all cursor-pointer group ${
        isCheapest
          ? "border-brand-400 shadow-lg bg-gradient-to-br from-brand-50 to-white"
          : "border-surface-100 bg-white hover:shadow-md hover:border-surface-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <PlatformLogoBox slug={slug} name={name} colorHex={color} size={32} />
        <div className="flex-1">
          <p className="font-bold text-surface-900">{name}</p>
          <div className="flex items-center gap-1 text-xs text-surface-400">
            <Clock className="w-3 h-3" />
            {avgDelivery} min avg delivery
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isCheapest && (
            <span className="text-[9px] font-black bg-brand-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              CHEAPEST
            </span>
          )}
          {isFastest && (
            <span className="text-[9px] font-black bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full tracking-wide">
              FASTEST
            </span>
          )}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-1 text-sm border-t border-surface-100 pt-2 mb-3">
        <div className="flex justify-between text-surface-500">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        <div className="flex justify-between text-xs text-surface-400">
          <span>Delivery</span>
          <span className={deliveryFee === 0 ? "text-brand-600 font-semibold" : ""}>
            {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
          </span>
        </div>
        <div className="flex justify-between font-black text-surface-900 text-base">
          <span>Total</span>
          <span>₹{grandTotal}</span>
        </div>
      </div>

      {/* CTA */}
      <div
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-opacity group-hover:opacity-90"
        style={{
          backgroundColor: color ?? meta?.color ?? "#888",
          color: meta?.textColor ?? "#ffffff",
        }}
      >
        Shop on {name}
        <ArrowRight className="w-4 h-4" />
      </div>
    </motion.a>
  );
}

// ── Main Cart Page ────────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter();
  const { hasHydrated, isAuthenticated, isValidatingSession } = useAuthStore();
  const { cart, isLoading, fetchCart, _hasHydrated: cartHydrated } = useCartStore();
  const [deliverySlot, setDeliverySlot] = useState<"standard" | "urgent">("standard");
  const productIds = cart?.items.map((i) => i.product.id) ?? [];

  // Redirect if not authenticated — but WAIT until session validation completes.
  // Without this guard, the cart page redirects to login while api.me() is still
  // in flight (isAuthenticated is briefly false before the server confirms the session).
  useEffect(() => {
    if (hasHydrated && !isValidatingSession && !isAuthenticated) {
      router.replace("/auth/login?next=/cart");
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router]);

  // Fetch cart on mount — always fetch from server when authenticated so that
  // cross-device changes (items added on another device/session) are reflected.
  // We wait for BOTH stores to rehydrate before calling the API.
  useEffect(() => {
    if (hasHydrated && cartHydrated && isAuthenticated) {
      fetchCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, cartHydrated, isAuthenticated]);

  // ── ALL hooks must be called before any conditional return ──────────────────
  // Fetch all product prices for the platform comparison sidebar.
  // Uses POST /products/bulk — ONE request for all cart items instead of N parallel calls.
  const { data: productsMap } = useQuery<Record<string, ProductWithPrices>>({
    queryKey: ["cart-all-prices", ...productIds],
    queryFn: async () => {
      // Separate real UUIDs from mock IDs
      const realIds = productIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );
      const mockIds = productIds.filter((id) => !realIds.includes(id));

      // Seed map with mock products (no network call needed)
      const entries: [string, ProductWithPrices][] = mockIds
        .map((id) => {
          const m = MOCK_PRODUCTS.find((p) => p.id === id);
          return m ? ([id, m] as [string, ProductWithPrices]) : null;
        })
        .filter(Boolean) as [string, ProductWithPrices][];

      // Single bulk call for all real products
      if (realIds.length > 0) {
        try {
          const { data } = await api.getBulkProducts(realIds);
          for (const product of data) {
            entries.push([product.id, product]);
          }
        } catch {
          // Fallback: fetch individually if bulk endpoint fails
          const fallback = await Promise.all(
            realIds.map(async (id) => {
              try {
                const { data } = await api.getProduct(id);
                return [id, data] as [string, ProductWithPrices];
              } catch {
                return null;
              }
            })
          );
          for (const pair of fallback) {
            if (pair) entries.push(pair);
          }
        }
      }

      return Object.fromEntries(entries);
    },
    enabled: productIds.length > 0,
    staleTime: 5 * 60_000,
  });

  // Compute totals per platform across all cart items
  const platformSummaries = useMemo(() => {
    if (!cart || !productsMap) return [];

    const map = new Map<
      string,
      {
        id: string;
        slug: string;
        name: string;
        color_hex: string | null;
        avg_delivery_minutes: number;
        delivery_fee: number;
        free_delivery_threshold: number | null;
        subtotal: number;
      }
    >();

    for (const item of cart.items) {
      const pw = productsMap[item.product.id];
      if (!pw) continue;
      for (const pp of pw.platform_prices) {
        const existing = map.get(pp.platform.id);
        if (existing) {
          existing.subtotal += pp.price * item.quantity;
        } else {
          map.set(pp.platform.id, {
            id: pp.platform.id,
            slug: pp.platform.slug,
            name: pp.platform.name,
            color_hex: pp.platform.color_hex,
            avg_delivery_minutes: pp.platform.avg_delivery_minutes,
            delivery_fee: pp.platform.delivery_fee,
            free_delivery_threshold: pp.platform.free_delivery_threshold,
            subtotal: pp.price * item.quantity,
          });
        }
      }
    }

    return Array.from(map.values())
      .map((p) => ({
        ...p,
        deliveryFee:
          p.subtotal >= (p.free_delivery_threshold ?? Infinity)
            ? 0
            : p.delivery_fee,
      }))
      .sort(
        (a, b) => a.subtotal + a.deliveryFee - (b.subtotal + b.deliveryFee)
      );
  }, [cart, productsMap]);

  const cheapestId = platformSummaries[0]?.id ?? "";
  const fastestId = platformSummaries.length
    ? platformSummaries.reduce((f, p) =>
        p.avg_delivery_minutes < f.avg_delivery_minutes ? p : f
      ).id
    : "";

  // Show skeleton while: waiting for hydration, session validation, or cart fetch.
  // isLoading only fires when authenticated so the order here is safe.
  if (!hasHydrated || isValidatingSession || isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="max-w-5xl mx-auto px-4 py-10" />;
  }

  // ── Empty state
  if (!cart?.items.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="text-8xl mb-6">🛒</div>
        <h1 className="text-2xl font-bold text-surface-900 mb-3">
          Your cart is empty
        </h1>
        <p className="text-surface-500 mb-8 max-w-sm mx-auto">
          Add products and instantly compare prices across Blinkit, Zepto,
          Instamart, BigBasket, Flipkart, Amazon &amp; more
        </p>
        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
        >
          <ShoppingBag className="w-5 h-5" />
          Start Shopping
        </Link>
      </div>
    );
  }

  // ── Savings callout
  const maxTotal = Math.max(
    ...platformSummaries.map((p) => p.subtotal + p.deliveryFee),
    0
  );
  const minTotal = platformSummaries.length
    ? platformSummaries[0].subtotal + platformSummaries[0].deliveryFee
    : 0;
  const savings = maxTotal - minTotal;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-surface-900">My Cart</h1>
        <span className="bg-brand-100 text-brand-700 text-sm font-semibold px-3 py-1 rounded-full">
          {cart.total_items} items
        </span>
      </div>

      {/* Savings banner */}
      {savings > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold px-4 py-2.5 rounded-xl">
          <span className="text-lg">💰</span>
          You can save up to{" "}
          <span className="font-black">₹{savings}</span> by choosing the
          cheapest platform!
        </div>
      )}

      {/* Delivery slot selector */}
      <div className="mb-6">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-2">
          Delivery Slot
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeliverySlot("standard")}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              deliverySlot === "standard"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-surface-200 bg-white text-surface-600 hover:border-surface-300"
            }`}
          >
            <CalendarClock className="w-4 h-4 flex-shrink-0" />
            <div className="text-left">
              <div>Standard</div>
              <div className="text-[11px] font-normal opacity-70">Scheduled delivery</div>
            </div>
          </button>
          <button
            onClick={() => setDeliverySlot("urgent")}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              deliverySlot === "urgent"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-surface-200 bg-white text-surface-600 hover:border-surface-300"
            }`}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            <div className="text-left">
              <div>Urgent</div>
              <div className="text-[11px] font-normal opacity-70">Same day delivery</div>
            </div>
          </button>
        </div>
        {/* Green surcharge notice — only shown when Urgent is selected */}
        {deliverySlot === "urgent" && (
          <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-2 rounded-lg">
            <Zap className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
            Slot surcharge applies for Urgent (same day) — an additional fee will be added to your total.
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Cart items with per-item platform comparison */}
        <div className="lg:col-span-3 space-y-4">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
            Items &amp; Platform Prices
          </p>
          <AnimatePresence mode="popLayout">
            {cart.items.map((item) => {
              const pw = productsMap?.[item.product.id]
                ?? MOCK_PRODUCTS.find((p) => p.id === item.product.id);
              return (
                <CartItemRow
                  key={item.id}
                  item={item}
                  platformPrices={pw?.platform_prices ?? []}
                />
              );
            })}
          </AnimatePresence>
        </div>

        {/* Right: Platform totals + Go buttons */}
        <div className="lg:col-span-2">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">
            Where to Buy — Full Cart
          </p>

          {platformSummaries.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-36 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {platformSummaries.map((p) => {
                return (
                  <PlatformTotalCard
                    key={p.id}
                    slug={p.slug}
                    name={p.name}
                    color={p.color_hex ?? PLATFORM_META[p.slug]?.color ?? "#888"}
                    subtotal={p.subtotal}
                    deliveryFee={p.deliveryFee}
                    avgDelivery={p.avg_delivery_minutes}
                    isCheapest={p.id === cheapestId}
                    isFastest={p.id === fastestId}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
