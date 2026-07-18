"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import Image from "next/image";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useBackendWakeup } from "@/hooks/useBackendWakeup";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAccessToken, isAuthenticated, hasHydrated, isValidatingSession } =
    useAuthStore();
  const { fetchCart, resetCart } = useCartStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { wakingUp, retryCountdown, trigger: triggerWakeup } = useBackendWakeup("login-form");
  const loginInProgress = useRef(false);

  useEffect(() => {
    if (hasHydrated && !isValidatingSession && isAuthenticated && !loginInProgress.current) {
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/";
      router.replace(safeNext);
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router, searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    loginInProgress.current = true;
    setLoading(true);
    try {
      const { data } = await api.login({ email, password: form.password });
      setAccessToken(data.access_token);
      let user = data.user;
      if (!user) {
        const meRes = await api.me();
        user = meRes.data;
      }
      setUser(user);
      toast.success(`Welcome back, ${user.full_name ?? "there"}!`);
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/";
      setLoading(false);
      loginInProgress.current = false;
      resetCart();
      fetchCart().catch(() => {});
      router.replace(safeNext);
    } catch (err: any) {
      loginInProgress.current = false;
      const status: number | undefined = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (!err?.response || status === 503) {
        triggerWakeup();
        setLoading(false);
        return;
      }

      let message: string;
      if (status === 401) {
        message = "Invalid email or password. Please try again.";
      } else if (status === 403) {
        message = "Your account has been disabled. Please contact support.";
      } else if (typeof detail === "string") {
        message = detail;
      } else {
        message = "Login failed. Please try again.";
      }

      toast.error(message);
      setLoading(false);
    }
  }

  if (!hasHydrated) return <PageLoader message="Loading" />;
  if (loading) return <PageLoader message="Logging you in" />;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
          <p className="text-sm text-surface-400 mb-6">Welcome back to PriceBasket</p>

          {wakingUp && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
              <span>
                Waking up servers, please wait…{" "}
                <span className="font-semibold">
                  {retryCountdown > 0 ? `Retrying in ${retryCountdown}s` : "Retrying…"}
                </span>
              </span>
            </div>
          )}

          <form id="login-form" onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email Address
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
              <label className="block text-sm font-medium text-surface-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-surface-200 rounded-xl px-4 py-2.5 pr-10 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || wakingUp}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {wakingUp ? "Waking up…" : "Login"}
            </button>
          </form>

          <p className="text-sm text-center text-surface-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-brand-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
