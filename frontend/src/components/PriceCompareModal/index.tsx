"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle2, Award, Clock, ShoppingCart, TrendingDown } from "lucide-react";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  // Close on Escape key
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
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl
                       max-h-[88vh] overflow-y-auto
                       md:bottom-auto md:top-1/2 md:-translate-y-1/2
                       md:left-1/2 md:-translate-x-1/2
                       md:w-full md:max-w-md md:rounded-3xl md:max-h-[85vh]"
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-surface-200 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-surface-100 hover:bg-surface-200
                         transition-colors z-10"
            >
              <X className="w-4 h-4 text-surface-600" />
            </button>

            {/* Product header */}
            <div className="flex items-center gap-4 px-5 pt-4 pb-4 border-b border-surface-100">
              <div className="w-16 h-16 rounded-2xl bg-surface-50 flex-shrink-0 overflow-hidden relative border border-surface-100">
                {product.thumbnail_url || product.image_url ? (
                  <Image
                    src={product.thumbnail_url ?? product.image_url!}
                    alt={product.name}
                    fill
                    sizes="64px"
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                )}
              </div>
              <div className="min-w-0 pr-8">
                {product.brand && (
                  <p className="text-xs text-surface-400 mb-0.5 truncate">{product.brand}</p>
                )}
                <h2 className="font-bold text-surface-900 text-base leading-snug line-clamp-2">
                  {product.name}
                </h2>
                {product.unit && (
                  <p className="text-xs text-surface-400 mt-0.5">{product.unit}</p>
                )}
              </div>
            </div>

            {/* Savings banner */}
            {savings > 0 && (
              <div className="mx-5 mt-4 px-4 py-3 rounded-2xl bg-green-50 border border-green-200
                              flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm text-green-800">
                  Save up to{" "}
                  <span className="font-bold text-green-700">₹{savings}</span>{" "}
                  by choosing the right platform
                </p>
              </div>
            )}

            {/* Platform comparison rows */}
            <div className="px-5 pt-4 pb-6 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-surface-400 mb-3">
                Price & Delivery Comparison
              </p>

              {sorted.map((pp, i) => {
                const isCheapest = i === 0 && sorted.length > 1;
                const isFastest = pp.platform.id === product.fastest_platform?.id;
                // Bar width: cheapest = 30%, most expensive = 100%
                const barPct =
                  maxPrice > minPrice
                    ? 30 + ((pp.price - minPrice) / (maxPrice - minPrice)) * 70
                    : 60;
                const isAdding = adding === pp.platform.id;

                return (
                  <div
                    key={pp.platform.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-shadow",
                      isCheapest
                        ? "border-green-300 bg-green-50/40 shadow-sm"
                        : "border-surface-200 bg-white"
                    )}
                  >
                    {/* Platform row */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Logo */}
                      <div
                        className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundColor: (pp.platform.color_hex ?? "#94a3b8") + "18",
                          border: `1.5px solid ${pp.platform.color_hex ?? "#e5e7eb"}35`,
                        }}
                      >
                        <PlatformLogo
                          slug={pp.platform.slug}
                          name={pp.platform.name}
                          colorHex={pp.platform.color_hex}
                          size={30}
                        />
                      </div>

                      {/* Name + badges + delivery */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-surface-900 text-sm">
                            {pp.platform.name}
                          </span>
                          {isCheapest && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold
                                             bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Cheapest
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
                            ? "Free delivery"
                            : `₹${pp.platform.delivery_fee} delivery`}
                          {pp.platform.free_delivery_threshold != null &&
                            pp.platform.delivery_fee > 0 && (
                              <span className="text-surface-400">
                                (free above ₹{pp.platform.free_delivery_threshold})
                              </span>
                            )}
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

                    {/* Relative price bar */}
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

                    {/* Add from this platform */}
                    <button
                      onClick={() => handleBuyFrom(pp.platform.id, pp.platform.name, pp.price)}
                      disabled={isAdding || !pp.is_available}
                      className={cn(
                        "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                        "active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed",
                        isCheapest
                          ? "bg-brand-600 hover:bg-brand-700 text-white"
                          : "bg-surface-100 hover:bg-surface-200 text-surface-800"
                      )}
                    >
                      {isAdding ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent
                                           rounded-full animate-spin" />
                          Adding…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Add from {pp.platform.name} · ₹{pp.price}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
