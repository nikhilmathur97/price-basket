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
  if (!err?.response) {
    // Raw network error — proxy itself is unreachable (should be rare after proxy fix)
    return "Cannot reach server — please try again in a few seconds.";
  }
  const status: number = err.response.status;
  const detail = err.response?.data?.detail;
  if (status === 409) return "Email already registered. Try signing in instead.";
  if (status === 503) {
    // Proxy returned 503: backend cold-starting or unreachable
    return typeof detail === "string"
      ? detail
      : "Server is starting up — please wait a moment and try again.";
  }
  if (status === 502) return "Service unavailable — please try again in a few seconds.";
  if (status === 500) return "Server error — please try again or contact support.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.msg) return first.msg.replace(/^Value error, /i, "");
  }
  return `Registration failed (HTTP ${status})`;
}

export default function SignupPage() {
  const router = useRouter();
  const { setUser, setAccessToken, isAuthenticated, hasHydrated, isValidatingSession } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const signupInProgress = useRef(false);
  const { wakingUp, retryCountdown, trigger: triggerWakeup } = useBackendWakeup("signup-form");

  // Redirect already-authenticated users away from the signup page.
  // Only redirect after session validation finishes — prevents phantom-session redirect.
  useEffect(() => {
    if (hasHydrated && !isValidatingSession && isAuthenticated && !signupInProgress.current) {
      router.replace("/");
    }
  }, [hasHydrated, isValidatingSession, isAuthenticated, router]);

  // Only block on hydration — NOT on isValidatingSession.
  // isValidatingSession can hang if backend is slow (Render cold start) and would
  // make the signup form invisible. The redirect above already waits for it.
  if (!hasHydrated) {
    return <PageLoader message="Loading" />;
  }

  // Redirect is imminent — show loader to avoid flash of form before navigation.
  if (isAuthenticated && !isValidatingSession && !signupInProgress.current) {
    return <PageLoader message="Loading" />;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guard against double-submit
    const trimmedName = form.full_name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!trimmedName) { toast.error("Full name is required"); return; }
    if (form.password !== form.confirm) { toast.error("Passwords do not match"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(form.password)) { toast.error("Password must contain at least one uppercase letter"); return; }
    if (!/\d/.test(form.password)) { toast.error("Password must contain at least one number"); return; }

    setEmailError("");
    signupInProgress.current = true;
    setLoading(true);
    try {
      // Register now returns a TokenResponse (access_token + user) — no second login call needed.
      const { data } = await api.register({ email: normalizedEmail, password: form.password, full_name: trimmedName });
      setAccessToken(data.access_token);
      // Register response includes user — no extra api.me() round-trip needed.
      let user = data.user;
      if (!user) {
        const meRes = await api.me();
        user = meRes.data;
      }
      setUser(user);
      toast.success(`Welcome to PriceBasket, ${user.full_name ?? "there"}!`);
      // Clear loading BEFORE navigation so the spinner doesn't block the redirect
      setLoading(false);
      signupInProgress.current = false;
      resetCart();
      fetchCart().catch(() => {});
      // Navigate after state is cleared
      router.replace("/");
    } catch (err: any) {
      signupInProgress.current = false;
      const status = err?.response?.status;
      if (!err?.response || status === 503) {
        // Backend cold-starting — show waking-up banner + auto-retry in 5s
        triggerWakeup();
        setLoading(false);
        return;
      }
      if (status === 409) {
        setEmailError("This email is already registered. Sign in instead?");
      } else {
        toast.error(getSignupErrorMessage(err));
      }
      setLoading(false);
    }
  }

  if (loading) {
    return <PageLoader message="Creating your account" />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Image src="/pricebasket-logo.png" alt="PriceBasket" width={52} height={52} sizes="52px" className="w-[52px] h-[52px] object-contain" style={{ mixBlendMode: "multiply" }} priority />
            <span className="text-2xl font-bold">
              Price<span className="text-brand-600">Basket</span>
            </span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-surface-900 mb-1">Create account</h1>
          <p className="text-sm text-surface-400 mb-6">
            Start comparing prices and saving money
          </p>

          {/* Waking-up banner — shown when backend is cold-starting */}
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

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (emailError) setEmailError("");
                }}
                placeholder="you@example.com"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-brand-500
                            ${emailError ? "border-red-400 bg-red-50" : "border-surface-200"}`}
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  {emailError}
                  {emailError.includes("Sign in") && (
                    <a href="/auth/login" className="underline font-semibold ml-1">Sign in</a>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
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

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Confirm Password</label>
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter password"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-brand-500
                            ${form.confirm && form.confirm !== form.password
                              ? "border-red-400 bg-red-50"
                              : "border-surface-200"}`}
              />
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <p className="text-xs text-surface-500">
              Password must be 8+ characters and include at least one uppercase letter and one number.
            </p>

            <button
              type="submit"
              disabled={loading || wakingUp || (!!form.confirm && form.confirm !== form.password)}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {wakingUp ? "Waking up…" : "Create Account"}
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
