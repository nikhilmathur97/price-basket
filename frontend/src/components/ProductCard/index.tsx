"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [imgError, setImgError] = useState(false);

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

  const imgSrc = !imgError
    ? (product.thumbnail_url ?? product.image_url ?? SLUG_IMAGES[product.slug] ?? null)
    : null;

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
          // GPU-accelerated layer for smooth scrolling
          "transform-gpu",
          className
        )}
        style={{ WebkitTapHighlightColor: "transparent", willChange: "transform" }}
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
          <div className="relative bg-[#f9f9f9] overflow-hidden" style={{ aspectRatio: "1/1" }}>
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 40vw, 150px"
                className="object-contain p-2"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl select-none">🛒</div>
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
              <p className="text-[10px] text-surface-400 font-medium truncate mb-0.5">
                {product.brand}
              </p>
            )}
            {/* 2-line clamped name */}
            <h3 className="text-[12px] font-semibold text-surface-900 line-clamp-2 leading-snug mb-0.5 min-h-[2.2rem]">
              {product.name}
            </h3>
            {product.unit && (
              <p className="text-[10px] text-surface-400 mb-1 truncate">{product.unit}</p>
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
                <p className="text-[10px] text-surface-400 line-through leading-none mt-0.5 whitespace-nowrap">
                  {formatPrice(mrp)}
                </p>
              )}
            </div>

            {/* ADD / Counter — fixed, never overlaps price */}
            <div className="flex-shrink-0 ml-1">
              <AnimatePresence mode="wait" initial={false}>
                {qty === 0 ? (
                  <motion.div
                    key="add-row"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-1"
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
                    <button
                      onClick={handleAdd}
                      className="flex items-center gap-0.5 h-6 px-2 rounded-xl
                                 border-2 border-brand-600 text-brand-600 font-extrabold text-[11px]
                                 bg-white hover:bg-brand-600 hover:text-white
                                 active:scale-[0.95] transition-colors select-none flex-shrink-0"
                      style={{ touchAction: "manipulation" }}
                    >
                      <Plus className="w-3 h-3" />Add
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="counter"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-1"
                  >
                    <button
                      onClick={(e) => { e.preventDefault(); setShowCompare(true); }}
                      title="Compare platforms"
                      className="w-6 h-7 flex items-center justify-center rounded-lg
                                 border border-brand-200 text-brand-500
                                 hover:text-brand-700 hover:border-brand-500
                                 active:scale-[0.95] transition-colors flex-shrink-0"
                    >
                      <BarChart2 className="w-3 h-3" />
                    </button>
                    <div className="flex items-center bg-brand-600 rounded-xl overflow-hidden h-6 flex-shrink-0">
                      <button
                        onClick={handleDecrease}
                        className="flex items-center justify-center w-6 h-6 text-white hover:bg-brand-700 transition-colors"
                        style={{ touchAction: "manipulation" }}
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-white font-extrabold text-[11px] min-w-[16px] text-center px-0.5">
                        {qty}
                      </span>
                      <button
                        onClick={handleAdd}
                        className="flex items-center justify-center w-6 h-6 text-white hover:bg-brand-700 transition-colors"
                        style={{ touchAction: "manipulation" }}
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
