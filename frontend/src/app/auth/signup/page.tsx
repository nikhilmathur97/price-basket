"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import Image from "next/image";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useBackendWakeup } from "@/hooks/useBackendWakeup";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

function getSignupErrorMessage(err: any): string {
  if (!err?.response) return "Cannot reach server — please try again in a few seconds.";
  const status: number = err.response.status;
  const detail = err.response?.data?.detail;
  if (status === 409) return "Email already registered. Try signing in instead.";
  if (status === 503) return typeof detail === "string" ? detail : "Server is starting up — please wait and try again.";
  if (status === 502) return "Service unavailable — please try again in a few seconds.";
  if (status === 500) return "Server error — please try again or contact support.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.msg) return first.msg.replace(/^Value error, /i, "");
  }
  return `Registration failed (HTTP ${status})`;
}

const PASSWORD_HINT = "Min. 8 chars, 1 uppercase, 1 number, 1 special character";

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, isValidatingSession, setUser, setAccessToken } = useAuthStore();
  const { resetCart, fetchCart } = useCartStore();
  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const signupInProgress = useRef(false);
  const { wakingUp, retryCountdown, trigger: triggerWakeup } = useBackendWakeup("signup-form");

  useEffect(() => {
    if (hasHydrated && !isValidatingSession && isAuthenticated && !signupInProgress.current) {
      router.replace("/");
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router]);

  if (!hasHydrated) return <PageLoader message="Loading" />;
  if (isAuthenticated && !isValidatingSession && !signupInProgress.current) {
    return <PageLoader message="Loading" />;
  }
  if (loading) return <PageLoader message="Creating your account" />;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedName = form.full_name.trim();
    const mobile = form.mobile_number.trim();
    const email = form.email.trim().toLowerCase();

    if (!trimmedName) { toast.error("Full name is required"); return; }
    if (mobile && !/^\d{10}$/.test(mobile)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!email) { toast.error("Email address is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    if (form.password !== form.confirm) { toast.error("Passwords do not match"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(form.password)) { toast.error("Password must contain at least one uppercase letter"); return; }
    if (!/\d/.test(form.password)) { toast.error("Password must contain at least one number"); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(form.password)) {
      toast.error("Password must contain at least one special character");
      return;
    }

    signupInProgress.current = true;
    setLoading(true);
    try {
      const { data } = await api.register({
        full_name: trimmedName,
        email,
        password: form.password,
        mobile_number: mobile || undefined,
      });
      setAccessToken(data.access_token);
      let user = data.user;
      if (!user) {
        const meRes = await api.me();
        user = meRes.data;
      }
      setUser(user);
      toast.success(`Welcome to PriceBasket, ${user.full_name ?? "there"}!`);
      resetCart();
      fetchCart().catch(() => {});
      router.replace("/");
    } catch (err: any) {
      signupInProgress.current = false;
      const status = err?.response?.status;
      if (!err?.response || status === 503) {
        triggerWakeup();
        setLoading(false);
        return;
      }
      toast.error(getSignupErrorMessage(err));
      setLoading(false);
    }
  }

  const pwMismatch = !!form.confirm && form.confirm !== form.password;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
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
          <h1 className="text-xl font-bold text-surface-900 mb-1">Create account</h1>
          <p className="text-sm text-surface-400 mb-6">Start comparing prices and saving money</p>

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

          <form id="signup-form" onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Rahul Sharma"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Email (required — primary login identifier) */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email Address <span className="text-red-500">*</span>
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
              <p className="text-xs text-surface-400 mt-1">
                You&apos;ll use this to sign in
              </p>
            </div>

            {/* Mobile Number (optional) */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-500 font-medium select-none">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.mobile_number}
                  onChange={(e) =>
                    setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  placeholder="9876543210"
                  className="w-full border border-surface-200 rounded-xl pl-12 pr-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Optional — for order updates
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={PASSWORD_HINT}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter password"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-brand-500
                            ${pwMismatch ? "border-red-400 bg-red-50" : "border-surface-200"}`}
              />
              {pwMismatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <p className="text-xs text-surface-500">{PASSWORD_HINT}</p>

            <button
              type="submit"
              disabled={loading || wakingUp || pwMismatch}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {wakingUp ? "Waking up…" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-center text-surface-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-xs text-center text-surface-400 mt-4 px-4">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
