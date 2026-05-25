"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

function getSignupErrorMessage(err: any): string {
  // No response at all → backend is not reachable / Next.js proxy failed
  if (!err?.response) {
    return err?.message === "Network Error"
      ? "Cannot reach server — backend may be down. Please try again."
      : (err?.message ?? "Registration failed");
  }

  const status: number = err.response.status;
  const detail = err.response?.data?.detail;

  if (status === 409) return "Email already registered. Try signing in instead.";
  if (status === 502 || status === 503) return "Service unavailable — backend is not running. Please try again later.";
  if (status === 500) return "Server error — database may not be set up. Contact support.";

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.msg) return first.msg.replace(/^Value error, /i, "");
  }

  return `Registration failed (HTTP ${status})`;
}

export default function SignupPage() {
  const router = useRouter();
  const { setUser, setAccessToken, isAuthenticated, hasHydrated } = useAuthStore();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.full_name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!trimmedName) {
      toast.error("Full name is required");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (!/\d/.test(form.password)) {
      toast.error("Password must contain at least one number");
      return;
    }

    setLoading(true);
    try {
      await api.register({
        email: normalizedEmail,
        password: form.password,
        full_name: trimmedName,
      });
      // Auto-login after registration
      const { data } = await api.login({ email: normalizedEmail, password: form.password });
      setAccessToken(data.access_token);
      const { data: user } = await api.me();
      setUser(user);
      toast.success(`Welcome to Price Basket, ${user.full_name ?? "there"}!`);
      window.location.href = "/";
    } catch (err: any) {
      toast.error(getSignupErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Image src="/pricebasket-logo.png" alt="PriceBasket" width={52} height={52} className="w-[52px] h-[52px] object-contain" priority />
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

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Full Name
              </label>
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
              disabled={loading || (!!form.confirm && form.confirm !== form.password)}
              className="btn-primary w-full"
            >
              {loading ? "Creating account..." : "Create Account"}
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
