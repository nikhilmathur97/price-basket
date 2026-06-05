"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ShoppingBag, ShoppingCart, Bell, ArrowRight } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, isValidatingSession } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isValidatingSession && !isAuthenticated) {
      router.replace("/auth/login?next=/orders");
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router]);

  // Wait for hydration + session validation before deciding to redirect.
  if (!hasHydrated || isValidatingSession) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      {/* Icon */}
      <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-100">
        <ShoppingBag className="w-11 h-11 text-brand-500" />
      </div>

      <h1 className="text-2xl font-bold text-surface-900 mb-3">Saved Orders</h1>
      <p className="text-surface-500 max-w-sm mx-auto mb-8 leading-relaxed">
        Order history and saved carts are coming soon. For now, use your cart to compare prices
        and head to your preferred platform to complete checkout.
      </p>

      {/* Quick action cards */}
      <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
        <Link
          href="/cart"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-surface-100
                     shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
        >
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-surface-900 text-sm">My Cart</p>
            <p className="text-xs text-surface-400">View &amp; compare prices</p>
          </div>
          <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 ml-auto transition-colors" />
        </Link>

        <Link
          href="/alerts"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-surface-100
                     shadow-sm hover:shadow-md hover:border-amber-200 transition-all group"
        >
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-surface-900 text-sm">Price Alerts</p>
            <p className="text-xs text-surface-400">Track price drops</p>
          </div>
          <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-amber-500 ml-auto transition-colors" />
        </Link>
      </div>

      <Link href="/search" className="btn-primary inline-flex items-center gap-2">
        <ShoppingBag className="w-4 h-4" />
        Browse Products
      </Link>
    </div>
  );
}
