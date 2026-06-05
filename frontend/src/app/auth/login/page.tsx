"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    setUser,
    setAccessToken,
    isAuthenticated,
    hasHydrated,
    isValidatingSession,
  } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  // Prevent the "already authenticated" useEffect from firing during an active login
  const loginInProgress = useRef(false);

  // Redirect already-authenticated users away from the login page.
  // Wait until:
  //   1. The persisted store has hydrated (hasHydrated)
  //   2. The background session validation has finished (isValidatingSession=false)
  //      so a stale/phantom session gets cleaned up BEFORE we redirect.
  //   3. No login is currently in progress (loginInProgress.current=false)
  useEffect(() => {
    if (
      hasHydrated &&
      !isValidatingSession &&
      isAuthenticated &&
      !loginInProgress.current
    ) {
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/";
      router.replace(safeNext);
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router, searchParams]);

  // Show loader while hydrating OR while the background session check is running.
  // This prevents the phantom-session redirect: we don't redirect until we know
  // whether the persisted session is actually valid.
  if (!hasHydrated || isValidatingSession) {
    return <PageLoader message="Loading" />;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guard against double-submit
    loginInProgress.current = true;
    setLoading(true);
    try {
      const { data } = await api.login(form);
      setAccessToken(data.access_token);
      // Login response includes user — no second api.me() round-trip needed.
      // If for any reason user is absent (older backend), fall back to api.me().
      let user = data.user;
      if (!user) {
        const meRes = await api.me();
        user = meRes.data;
      }
      setUser(user);
      toast.success(`Welcome back, ${user.full_name ?? "there"}!`);
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/";
      // Navigate immediately — fetch cart in background (non-blocking)
      router.replace(safeNext);
      resetCart();
      fetchCart().catch(() => {});
    } catch (err: any) {
      loginInProgress.current = false;
      const detail =
        err?.response?.data?.detail ??
        "Login failed. Please check your credentials.";
      toast.error(detail);
      setLoading(false);
    }
  }

  if (loading) {
    return <PageLoader message="Logging you in" />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Image
              src="/pricebasket-logo.png"
              alt="PriceBasket"
              width={52}
              height={52}
              sizes="52px"
              className="w-[52px] h-[52px] object-contain"
              style={{ mixBlendMode: "multiply" }}
              priority
            />
            <span className="text-2xl font-bold">
              Price<span className="text-brand-600">Basket</span>
            </span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-surface-900 mb-1">Login</h1>
          <p className="text-sm text-surface-400 mb-6">
            Welcome back to PriceBasket
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full border border-surface-200 rounded-xl px-4 py-2.5 pr-10 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Login
            </button>
          </form>

          <p className="text-sm text-center text-surface-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-brand-600 font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
