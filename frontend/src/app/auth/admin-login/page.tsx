"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setUser, setAccessToken, isAuthenticated, hasHydrated, isValidatingSession } =
    useAuthStore();
  const { fetchCart, resetCart } = useCartStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const loginInProgress = useRef(false);

  useEffect(() => {
    if (hasHydrated && !isValidatingSession && isAuthenticated && !loginInProgress.current) {
      router.replace("/admin");
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    loginInProgress.current = true;
    setLoading(true);
    try {
      const { data } = await api.loginEmail({ email: form.email.trim(), password: form.password });
      setAccessToken(data.access_token);
      let user = data.user;
      if (!user) {
        const meRes = await api.me();
        user = meRes.data;
      }
      if (!user.is_admin) {
        toast.error("Access denied — this login is for admins only.");
        setLoading(false);
        loginInProgress.current = false;
        return;
      }
      setUser(user);
      toast.success(`Welcome back, ${user.full_name ?? "Admin"}!`);
      setLoading(false);
      loginInProgress.current = false;
      resetCart();
      fetchCart().catch(() => {});
      router.replace("/admin");
    } catch (err: any) {
      loginInProgress.current = false;
      const status: number | undefined = err?.response?.status;
      const detail = err?.response?.data?.detail;

      let message: string;
      if (status === 401) {
        message = "Invalid email or password.";
      } else if (status === 403) {
        message = "Account disabled. Contact support.";
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">Admin Login</h1>
              <p className="text-xs text-surface-400">Restricted — admins only</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@pricebasket.in"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                             focus:outline-none focus:ring-2 focus:ring-violet-500"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm
                         transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Sign in as Admin
            </button>
          </form>

          <p className="text-sm text-center text-surface-500 mt-6">
            Regular user?{" "}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              Login with mobile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
