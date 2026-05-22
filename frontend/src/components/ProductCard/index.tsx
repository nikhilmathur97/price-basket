"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, Plus, Minus, BarChart2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { ProductWithPrices } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import PriceCompareModal from "@/components/PriceCompareModal";
import { cn } from "@/lib/utils";
import { trackEvent, extractApiError } from "@/services/api";

interface ProductCardProps {
  product: ProductWithPrices;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, updateItem, removeItem, cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [showCompare, setShowCompare] = useState(false);

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
      toast("Please log in to add items", { icon: "🔒" });
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

  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "bg-white rounded-2xl border border-surface-100 overflow-hidden flex flex-col",
          "shadow-[0_1px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]",
          "transition-shadow duration-200",
          className
        )}
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
          {/* ── Image ── */}
          <div className="relative aspect-square bg-[#f9f9f9] overflow-hidden">
            {product.thumbnail_url || product.image_url ? (
              <Image
                src={product.thumbnail_url ?? product.image_url!}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-contain p-3 hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl select-none">🛒</div>
            )}

            {/* Discount badge */}
            {maxDiscount > 0 && (
              <div className="absolute top-2 left-2 bg-[#256fef] text-white
                              text-[10px] font-extrabold px-1.5 py-0.5 rounded-[4px] leading-none">
                {Math.round(maxDiscount)}% OFF
              </div>
            )}

            {/* Store count */}
            {product.platform_prices.length > 1 && (
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm
                              text-[10px] font-bold text-surface-500
                              px-1.5 py-0.5 rounded-[4px] border border-surface-100 leading-none">
                {product.platform_prices.length} stores
              </div>
            )}
          </div>
        </Link>

        {/* ── Info + Buttons ── */}
        <div className="p-3 flex flex-col flex-1">
          <Link href={`/product/${product.id}`} className="block flex-1">
            {product.brand && (
              <p className="text-[11px] text-surface-400 font-medium truncate mb-0.5">
                {product.brand}
              </p>
            )}
            <h3 className="text-[13px] font-semibold text-surface-900 line-clamp-2 leading-snug mb-1">
              {product.name}
            </h3>
            {product.unit && (
              <p className="text-[11px] text-surface-400 mb-2">{product.unit}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              {product.cheapest_platform && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                 text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                  <CheckCircle2 className="w-2.5 h-2.5" />Cheapest
                </span>
              )}
              {fastestMins < Infinity && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                 text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full border border-yellow-100">
                  <Zap className="w-2.5 h-2.5 fill-yellow-600" />{fastestMins}min
                </span>
              )}
            </div>
          </Link>

          {/* ── Price + ADD row ── */}
          <div className="flex items-end justify-between gap-2 mt-auto">
            {/* Price */}
            <div>
              {cheapestPrice !== null && (
                <p className="text-[15px] font-extrabold text-surface-900 leading-none">
                  ₹{cheapestPrice}
                </p>
              )}
              {mrp > (cheapestPrice ?? 0) && (
                <p className="text-[11px] text-surface-400 line-through leading-none mt-0.5">
                  ₹{mrp}
                </p>
              )}
            </div>

            {/* ADD / Counter */}
            <AnimatePresence mode="wait">
              {qty === 0 ? (
                <motion.div
                  key="add-row"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-1.5 flex-shrink-0"
                >
                  <button
                    onClick={(e) => { e.preventDefault(); setShowCompare(true); }}
                    title="Compare platforms"
                    className="w-7 h-7 flex items-center justify-center rounded-lg
                               border border-surface-200 text-surface-400
                               hover:text-brand-600 hover:border-brand-400
                               active:scale-[0.95] transition-all"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-1 h-8 px-3 rounded-xl
                               border-2 border-brand-600 text-brand-600 font-extrabold text-sm
                               bg-white hover:bg-brand-600 hover:text-white
                               active:scale-[0.95] transition-all select-none"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Plus className="w-3.5 h-3.5" />Add
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.12 }}
                  className="flex flex-col items-end gap-1 flex-shrink-0"
                >
                  <div className="flex items-center bg-brand-600 rounded-xl overflow-hidden h-8">
                    <button
                      onClick={handleDecrease}
                      className="flex items-center justify-center w-8 h-8 text-white hover:bg-brand-700 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white font-extrabold text-sm min-w-[24px] text-center px-1">
                      {qty}
                    </span>
                    <button
                      onClick={handleAdd}
                      className="flex items-center justify-center w-8 h-8 text-white hover:bg-brand-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setShowCompare(true); }}
                    className="text-[10px] text-brand-600 hover:underline flex items-center gap-0.5"
                  >
                    <BarChart2 className="w-2.5 h-2.5" />compare
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <PriceCompareModal
        product={showCompare ? product : null}
        onClose={() => setShowCompare(false)}
      />
    </>
  );
}
