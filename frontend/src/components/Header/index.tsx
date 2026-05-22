"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingCart, Zap, ChevronDown, LogOut, User, Bell, Package, Settings } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { SearchBar } from "@/components/SearchBar";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export function Header() {
  const router = useRouter();
  const { totalItems, openCart, resetCart } = useCartStore();
  const { isAuthenticated, user, logout, hasHydrated } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    // Revoke the server-side refresh-token cookie first, then clear local state.
    // Fire-and-forget — even if the API call fails we still clear local state.
    try { await api.logout(); } catch { /* ignore */ }
    logout();
    resetCart();
    toast("See you soon! 👋", { duration: 1500 });
    setMenuOpen(false);
    setTimeout(() => window.location.replace("/"), 300);
  }

  function handleCartClick() {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      toast("Please login to view your cart", { icon: "🔒" });
      router.push("/auth/login?next=/cart");
      return;
    }
    openCart();
  }

  const menuLinks = [
    { href: "/profile",  icon: User,     label: "My Profile"     },
    { href: "/orders",   icon: Package,  label: "Saved Orders"   },
    { href: "/alerts",   icon: Bell,     label: "Price Alerts"   },
    ...(user?.is_admin
      ? [{ href: "/admin", icon: Settings, label: "Admin Dashboard" }]
      : []),
  ] as const;

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_#f0f0f0]">
      <div className="max-w-screen-xl mx-auto px-4">

        {/* ── Row 1: Logo + Actions ── */}
        <div className="flex items-center h-14 gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[15px] font-extrabold text-surface-900 tracking-tight leading-none">
                Price<span className="text-brand-600">Basket</span>
              </p>
              <p className="text-[10px] text-surface-400 font-medium leading-none mt-0.5">
                Compare 4 platforms
              </p>
            </div>
          </Link>

          {/* Search bar — desktop only (md+) */}
          <div className="flex-1 hidden md:flex items-center max-w-2xl mx-4">
            <SearchBar />
          </div>

          {/* Spacer — mobile */}
          <div className="flex-1 md:hidden" />

          {/* Cart button — desktop only (BottomNav handles mobile) */}
          <button
            onClick={handleCartClick}
            aria-label="Cart"
            className="relative hidden md:flex items-center gap-1.5 h-9 px-3 rounded-xl
                       hover:bg-surface-100 active:bg-surface-200 active:scale-[0.96]
                       transition-all cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5 text-surface-700" />
            {isAuthenticated && totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-1 -right-1 bg-brand-600 text-white
                           text-[10px] font-extrabold min-w-[18px] h-[18px] px-1
                           rounded-full flex items-center justify-center leading-none"
              >
                {totalItems > 9 ? "9+" : totalItems}
              </motion.span>
            )}
            <span className="hidden sm:block text-sm font-semibold text-surface-700">
              Cart
            </span>
          </button>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 h-9 px-2 rounded-xl
                           hover:bg-surface-100 active:bg-surface-200 transition-all"
              >
                <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-extrabold">
                    {user?.full_name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-surface-500 transition-transform hidden sm:block
                              ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white
                                  rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                                  border border-surface-100 py-2 z-20 overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-surface-100">
                      <p className="text-sm font-bold text-surface-900 truncate">
                        {user?.full_name ?? "User"}
                      </p>
                      <p className="text-xs text-surface-400 truncate mt-0.5">{user?.email}</p>
                    </div>
                    {/* Links */}
                    {menuLinks.map(({ href, icon: Icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm
                                   text-surface-700 hover:bg-surface-50 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-surface-400" />
                        {label}
                      </Link>
                    ))}
                    <div className="border-t border-surface-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm
                                   text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="h-9 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.97]
                         text-white text-sm font-bold rounded-xl transition-all
                         flex items-center whitespace-nowrap"
            >
              Login
            </Link>
          )}
        </div>

        {/* ── Row 2: Search bar — mobile only (< md) ── */}
        <div className="pb-2.5 md:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
