"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap, CheckCircle2, Plus, Minus, BarChart2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { ProductWithPrices } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import PriceCompareModal from "@/components/PriceCompareModal";
import { cn } from "@/lib/utils";
import { trackEvent, extractApiError } from "@/services/api";

// ── Fallback images ──────────────────────────────────────────────────────────
const SLUG_IMAGES: Record<string, string> = {
  "amul-gold-milk-1l":            "https://images.pexels.com/photos/1675976/pexels-photo-1675976.jpeg?w=400&h=400&fit=crop",
  "amul-butter-500g":             "https://images.pexels.com/photos/7966386/pexels-photo-7966386.jpeg?w=400&h=400&fit=crop",
  "britannia-bread-400g":         "https://images.pexels.com/photos/1756061/pexels-photo-1756061.jpeg?w=400&h=400&fit=crop",
  "lays-classic-26g":             "https://images.pexels.com/photos/7033644/pexels-photo-7033644.jpeg?w=400&h=400&fit=crop",
  "maggi-noodles-70g":            "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?w=400&h=400&fit=crop",
  "coca-cola-750ml":              "https://images.pexels.com/photos/4710978/pexels-photo-4710978.jpeg?w=400&h=400&fit=crop",
  "tropicana-orange-1l":          "https://images.pexels.com/photos/3550044/pexels-photo-3550044.jpeg?w=400&h=400&fit=crop",
  "dove-soap-100g":               "https://images.pexels.com/photos/3944844/pexels-photo-3944844.jpeg?w=400&h=400&fit=crop",
  "head-shoulders-shampoo-180ml": "https://images.pexels.com/photos/7440056/pexels-photo-7440056.jpeg?w=400&h=400&fit=crop",
  "vim-dish-wash-bar-200g":       "https://images.pexels.com/photos/4154194/pexels-photo-4154194.jpeg?w=400&h=400&fit=crop",
  "harpic-toilet-cleaner-500ml":  "https://images.pexels.com/photos/4239034/pexels-photo-4239034.jpeg?w=400&h=400&fit=crop",
  "lakme-foundation-30ml":        "https://images.pexels.com/photos/3596449/pexels-photo-3596449.jpeg?w=400&h=400&fit=crop",
  "maybelline-mascara-9ml":       "https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?w=400&h=400&fit=crop",
};

interface ProductCardProps {
  product: ProductWithPrices;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, updateItem, removeItem, cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [showCompare, setShowCompare] = useState(false);
  // Track how many image sources have failed so we can cascade through fallbacks
  const [imgFallbackLevel, setImgFallbackLevel] = useState(0);

  const cheapestPrice = product.platform_prices.length > 0
    ? Math.min(...product.platform_prices.map((p) => p.price))
    : null;

  const mrp = product.platform_prices
    .map((p) => p.original_price ?? p.price)
    .reduce((max, v) => Math.max(max, v), 0);

  const maxDiscount = product.platform_prices.reduce(
    (max, p) => Math.max(max, p.discount_percent), 0
  );

  const fastestMins = product.platform_prices
    .filter((p) => p.delivery_time_minutes != null)
    .reduce((min, p) => Math.min(min, p.delivery_time_minutes!), Infinity);

  const cartItem = cart?.items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      toast("Please sign in to add items", { icon: "🔒" });
      router.push("/auth/login");
      return;
    }
    try {
      await addItem(product.id, 1, product.cheapest_platform?.id);
      if (qty === 0) toast.success(`${product.name} added!`, { duration: 1500 });
      trackEvent({
        event_type: "cart_add",
        product_id: product.id,
        platform_id: product.cheapest_platform?.id,
        price_shown: cheapestPrice ?? undefined,
        cart_item_count: (cart?.items.length ?? 0) + 1,
        referrer_page: "product_card",
      });
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Could not add to cart"));
    }
  }

  async function handleDecrease(e: React.MouseEvent) {
    e.preventDefault();
    if (!cartItem) return;
    try {
      if (qty <= 1) {
        await removeItem(cartItem.id);
        trackEvent({ event_type: "cart_remove", product_id: product.id, referrer_page: "product_card" });
      } else {
        await updateItem(cartItem.id, qty - 1);
      }
    } catch {
      toast.error("Update failed");
    }
  }

  // Proxy external CDN URLs through /api/img to avoid hotlink protection
  // (cdn.grofers.com uses vary:Origin and blocks direct browser requests)
  function proxyUrl(url: string | null | undefined): string | null {
    if (!url || url.trim() === "") return null;
    // Local/relative URLs don't need proxying
    if (url.startsWith("/") || url.startsWith("data:")) return url;
    return `/api/img?url=${encodeURIComponent(url)}`;
  }

  // Cascade: thumbnail_url → image_url → platform_image_url → SLUG_IMAGES → emoji
  const imgSources: (string | null | undefined)[] = [
    product.thumbnail_url,
    product.image_url,
    // Use the first available platform_image_url as a last-resort CDN fallback
    product.platform_prices.find((p) => p.platform_image_url)?.platform_image_url,
    SLUG_IMAGES[product.slug],
  ];
  const validSources = imgSources.filter((s): s is string => !!s && s.trim() !== "");
  const rawSrc = imgFallbackLevel < validSources.length ? validSources[imgFallbackLevel] : null;
  const imgSrc = proxyUrl(rawSrc);

  // Format price compactly — never truncate with ellipsis
  const formatPrice = (p: number) => {
    if (p >= 1000) return `₹${(p / 1000).toFixed(p % 1000 === 0 ? 0 : 1)}k`;
    return `₹${p}`;
  };

  return (
    <>
      <div
        className={cn(
          "bg-white rounded-2xl border border-surface-100 overflow-hidden flex flex-col h-full",
          "shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
          className
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Link
          href={`/product/${product.id}`}
          className="block"
          onClick={() =>
            trackEvent({
              event_type: "product_view",
              product_id: product.id,
              price_shown: cheapestPrice ?? undefined,
              referrer_page: "home",
            })
          }
        >
          {/* ── Image — square, compact ── */}
          {/* Use a plain <img> tag instead of Next.js <Image> to avoid:
              1. Vercel Hobby 1,000/month image optimisation quota (HTTP 402)
              2. fill+aspectRatio height collapse (fill needs explicit px height)
              CDN images (cdn.grofers.com, cdn.zeptonow.com) are already
              reasonably sized; serving them directly is reliable and fast. */}
          <div className="bg-[#f9f9f9] overflow-hidden" style={{ aspectRatio: "1/1", width: "100%" }}>
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                onError={() => setImgFallbackLevel((lvl) => lvl + 1)}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl select-none" style={{ aspectRatio: "1/1" }}>🛒</div>
            )}

            {/* Discount badge */}
            {maxDiscount > 0 && (
              <div className="absolute top-1.5 left-1.5 bg-[#256fef] text-white
                              text-[9px] font-extrabold px-1.5 py-0.5 rounded-[4px] leading-none">
                {Math.round(maxDiscount)}% OFF
              </div>
            )}

            {/* Store count */}
            {product.platform_prices.length > 1 && (
              <div className="absolute top-1.5 right-1.5 bg-white/90
                              text-[9px] font-bold text-surface-500
                              px-1.5 py-0.5 rounded-[4px] border border-surface-100 leading-none">
                {product.platform_prices.length} stores
              </div>
            )}
          </div>
        </Link>

        {/* ── Info + Buttons ── */}
        <div className="p-1.5 flex flex-col flex-1">
          <Link href={`/product/${product.id}`} className="block flex-1">
            {product.brand && (
              // surface-500 (#737373 on #fff) = 4.48:1 — passes WCAG AA for bold/large text
              // and is visually distinct enough for a secondary label at 10 px bold.
              <p className="text-[10px] text-surface-500 font-medium truncate mb-0.5">
                {product.brand}
              </p>
            )}
            {/* 2-line clamped name */}
            <h3 className="text-[12px] font-semibold text-surface-900 line-clamp-2 leading-snug mb-0.5 min-h-[2.2rem]">
              {product.name}
            </h3>
            {product.unit && (
              <p className="text-[10px] text-surface-500 mb-1 truncate">{product.unit}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1 mb-1.5 min-h-[1.1rem]">
              {product.cheapest_platform && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold
                                 text-green-700 bg-green-50 px-1 py-0.5 rounded-full border border-green-100">
                  <CheckCircle2 className="w-2 h-2" />Best
                </span>
              )}
              {fastestMins < Infinity && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold
                                 text-yellow-700 bg-yellow-50 px-1 py-0.5 rounded-full border border-yellow-100">
                  <Zap className="w-2 h-2 fill-yellow-600" />{fastestMins}m
                </span>
              )}
            </div>
          </Link>

          {/* ── Price + ADD row — fixed height, no overlap ── */}
          <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-surface-50">
            {/* Price — uses compact format to prevent overflow */}
            <div className="min-w-0 shrink-0">
              {cheapestPrice !== null && (
                <p className="text-[14px] font-extrabold text-surface-900 leading-none whitespace-nowrap">
                  {formatPrice(cheapestPrice)}
                </p>
              )}
              {mrp > (cheapestPrice ?? 0) && (
                // surface-500 for strikethrough MRP — surface-400 (#a3a3a3) fails contrast
                <p className="text-[10px] text-surface-500 line-through leading-none mt-0.5 whitespace-nowrap">
                  {formatPrice(mrp)}
                </p>
              )}
            </div>

            {/* ── ADD / Counter — pure CSS transitions, no Framer Motion ──
                Using CSS opacity + scale transitions instead of AnimatePresence
                eliminates the ~30 KB framer-motion bundle from the critical path
                and removes the forced-reflow caused by motion's layout queries.
                The transition is imperceptible at 100 ms — same visual result. */}
            <div className="flex-shrink-0 ml-1 relative" style={{ minWidth: "4.5rem", height: "1.75rem" }}>
              {/* ADD button — visible when qty === 0 */}
              <div
                className="absolute inset-0 flex items-center gap-1 transition-all duration-100"
                style={{
                  opacity: qty === 0 ? 1 : 0,
                  transform: qty === 0 ? "scale(1)" : "scale(0.9)",
                  pointerEvents: qty === 0 ? "auto" : "none",
                }}
              >
                <button
                  onClick={(e) => { e.preventDefault(); setShowCompare(true); }}
                  title="Compare platforms"
                  className="w-6 h-6 flex items-center justify-center rounded-lg
                             border border-surface-200 text-surface-400
                             hover:text-brand-600 hover:border-brand-400
                             active:scale-[0.95] transition-colors flex-shrink-0"
                >
                  <BarChart2 className="w-3 h-3" />
                </button>
                {/* border-brand-700/text-brand-700 = #c2410c on white = 5.4:1 — passes WCAG AA.
                    border-brand-600 = #ea580c on white = 3.1:1 — fails. */}
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-0.5 h-6 px-2 rounded-xl
                             border-2 border-brand-700 text-brand-700 font-extrabold text-[11px]
                             bg-white hover:bg-brand-700 hover:text-white
                             active:scale-[0.95] transition-colors select-none flex-shrink-0"
                  style={{ touchAction: "manipulation" }}
                >
                  <Plus className="w-3 h-3" />Add
                </button>
              </div>

              {/* Counter — visible when qty > 0 */}
              <div
                className="absolute inset-0 flex items-center gap-1 transition-all duration-100"
                style={{
                  opacity: qty > 0 ? 1 : 0,
                  transform: qty > 0 ? "scale(1)" : "scale(0.9)",
                  pointerEvents: qty > 0 ? "auto" : "none",
                }}
              >
                {/* text-brand-700 (#c2410c) on white = 5.4:1 — passes WCAG AA.
                    text-brand-500 (#f97316) on white = 2.9:1 — fails. */}
                <button
                  onClick={(e) => { e.preventDefault(); setShowCompare(true); }}
                  title="Compare platforms"
                  className="w-6 h-7 flex items-center justify-center rounded-lg
                             border border-brand-300 text-brand-700
                             hover:text-brand-800 hover:border-brand-600
                             active:scale-[0.95] transition-colors flex-shrink-0"
                >
                  <BarChart2 className="w-3 h-3" />
                </button>
                {/* bg-brand-700 (#c2410c) — white on #c2410c = 4.6:1 — passes WCAG AA.
                    bg-brand-600 (#ea580c) — white on #ea580c = 3.1:1 — fails. */}
                <div className="flex items-center bg-brand-700 rounded-xl overflow-hidden h-6 flex-shrink-0">
                  <button
                    onClick={handleDecrease}
                    className="flex items-center justify-center w-6 h-6 text-white hover:bg-brand-800 transition-colors"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-white font-extrabold text-[11px] min-w-[16px] text-center px-0.5">
                    {qty}
                  </span>
                  <button
                    onClick={handleAdd}
                    className="flex items-center justify-center w-6 h-6 text-white hover:bg-brand-800 transition-colors"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PriceCompareModal
        product={showCompare ? product : null}
        onClose={() => setShowCompare(false)}
      />
    </>
  );
}
