"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, CheckCircle2, Clock, ShoppingCart, TrendingDown, Star,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { ProductWithPrices } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { trackEvent, extractApiError } from "@/services/api";
import { PlatformLogo } from "@/components/PlatformLogo";

interface PriceCompareModalProps {
  product: ProductWithPrices | null;
  onClose: () => void;
}

export default function PriceCompareModal({ product, onClose }: PriceCompareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  const sorted = product
    ? [...product.platform_prices].sort((a, b) => a.price - b.price)
    : [];
  const minPrice = sorted[0]?.price ?? 0;
  const maxPrice = sorted[sorted.length - 1]?.price ?? 0;
  const savings = maxPrice - minPrice;

  async function handleBuyFrom(platformId: string, platformName: string, price: number) {
    if (!product) return;
    if (!isAuthenticated) {
      toast("Please log in to add items", { icon: "🔒" });
      onClose();
      router.push("/auth/login");
      return;
    }
    setAdding(platformId);
    try {
      await addItem(product.id, 1, platformId);
      toast.success(`Added from ${platformName}!`, { duration: 2000 });
      trackEvent({
        event_type: "cart_add",
        product_id: product.id,
        platform_id: platformId,
        price_shown: price,
        referrer_page: "compare_modal",
      });
      onClose();
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Could not add to cart"));
    } finally {
      setAdding(null);
    }
  }

  const modal = (
    <AnimatePresence>
      {product && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm"
          />

          {/* ── Modal — always centered on desktop, bottom-sheet on mobile ── */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className={cn(
              // Mobile: fixed bottom sheet
              "fixed bottom-0 left-0 right-0 z-[9999]",
              "bg-white rounded-t-3xl shadow-2xl",
              "max-h-[92vh] overflow-y-auto",
              // Desktop: centered dialog
              "sm:bottom-auto sm:top-1/2 sm:left-1/2",
              "sm:-translate-x-1/2 sm:-translate-y-1/2",
              "sm:w-[480px] sm:max-w-[95vw]",
              "sm:rounded-3xl sm:max-h-[88vh]"
            )}
          >
            {/* Drag handle — mobile only */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-surface-200 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-surface-100
                         hover:bg-surface-200 transition-colors z-10"
            >
              <X className="w-4 h-4 text-surface-600" />
            </button>

            {/* ── Product header ── */}
            <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b border-surface-100">
              {/* Product image */}
              <div className="w-20 h-20 rounded-2xl bg-surface-50 flex-shrink-0
                              overflow-hidden relative border border-surface-100 shadow-sm">
                {product.thumbnail_url || product.image_url ? (
                  <Image
                    src={product.thumbnail_url ?? product.image_url!}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                )}
              </div>

              {/* Product info */}
              <div className="min-w-0 flex-1 pr-8">
                {product.brand && (
                  <p className="text-xs text-surface-400 mb-0.5 truncate font-medium">{product.brand}</p>
                )}
                <h2 className="font-bold text-surface-900 text-[15px] leading-snug line-clamp-2">
                  {product.name}
                </h2>
                {product.unit && (
                  <p className="text-xs text-surface-400 mt-0.5">{product.unit}</p>
                )}
                {/* Platform count pill */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] font-semibold bg-brand-50 text-brand-700
                                   px-2 py-0.5 rounded-full border border-brand-100">
                    {sorted.length} platform{sorted.length !== 1 ? "s" : ""} available
                  </span>
                </div>
              </div>
            </div>

            {/* ── Savings banner ── */}
            {savings > 0 && (
              <div className="mx-5 mt-4 px-4 py-3 rounded-2xl
                              bg-gradient-to-r from-green-50 to-emerald-50
                              border border-green-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center
                                justify-center flex-shrink-0 shadow-sm">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">
                    Save up to ₹{savings}
                  </p>
                  <p className="text-[11px] text-green-600">
                    by choosing the cheapest platform
                  </p>
                </div>
              </div>
            )}

            {/* ── Section title ── */}
            <div className="px-5 pt-4 pb-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-surface-400">
                Price & Delivery Comparison
              </p>
            </div>

            {/* ── Platform rows ── */}
            <div className="px-5 pb-6 pt-2 space-y-3">
              {sorted.map((pp, i) => {
                const isCheapest = i === 0 && sorted.length > 1;
                const isFastest = pp.platform.id === product.fastest_platform?.id;
                const barPct =
                  maxPrice > minPrice
                    ? 30 + ((pp.price - minPrice) / (maxPrice - minPrice)) * 70
                    : 60;
                const isAdding = adding === pp.platform.id;

                return (
                  <motion.div
                    key={pp.platform.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isCheapest
                        ? "border-green-300 bg-gradient-to-br from-green-50/60 to-white shadow-sm"
                        : "border-surface-200 bg-white hover:border-surface-300"
                    )}
                  >
                    {/* Platform info row */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Logo */}
                      <div
                        className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center
                                   justify-center overflow-hidden p-1.5 shadow-sm"
                        style={{
                          backgroundColor: (pp.platform.color_hex ?? "#94a3b8") + "18",
                          border: `1.5px solid ${pp.platform.color_hex ?? "#e5e7eb"}40`,
                        }}
                      >
                        <PlatformLogo
                          slug={pp.platform.slug}
                          name={pp.platform.name}
                          colorHex={pp.platform.color_hex}
                          size={32}
                        />
                      </div>

                      {/* Name + badges + delivery */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-surface-900 text-sm">
                            {pp.platform.name}
                          </span>
                          {isCheapest && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold
                                             bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Best Price
                            </span>
                          )}
                          {isFastest && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold
                                             bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                              <Zap className="w-2.5 h-2.5" /> Fastest
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-surface-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {pp.delivery_time_minutes != null
                            ? `${pp.delivery_time_minutes} min`
                            : "—"}
                          <span className="text-surface-300">·</span>
                          {pp.platform.delivery_fee === 0
                            ? <span className="text-green-600 font-medium">Free delivery</span>
                            : `₹${pp.platform.delivery_fee} delivery`}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-extrabold text-surface-900">₹{pp.price}</p>
                        {pp.discount_percent > 0 && (
                          <p className="text-xs font-semibold text-green-600">
                            {pp.discount_percent}% off
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price bar */}
                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: isCheapest
                            ? "#16a34a"
                            : (pp.platform.color_hex ?? "#94a3b8"),
                        }}
                      />
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleBuyFrom(pp.platform.id, pp.platform.name, pp.price)}
                      disabled={isAdding || !pp.is_available}
                      className={cn(
                        "w-full py-3 rounded-xl text-sm font-bold transition-all",
                        "active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed",
                        isCheapest
                          ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-200"
                          : "bg-surface-100 hover:bg-surface-200 text-surface-800"
                      )}
                    >
                      {isAdding ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent
                                           rounded-full animate-spin" />
                          Adding…
                        </span>
                      ) : !pp.is_available ? (
                        "Out of stock"
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Add from {pp.platform.name} · ₹{pp.price}
                        </span>
                      )}
                    </button>
                  </motion.div>
                );
              })}

              {sorted.length === 0 && (
                <div className="text-center py-8 text-surface-400">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No platform prices available yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
