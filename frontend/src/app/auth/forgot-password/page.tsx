"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, CheckCircle, Phone } from "lucide-react";
import { api } from "@/services/api";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

function ForgotPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step"); // null = enter mobile, "reset" = new password

  const [mobile, setMobile] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset-password step — populated from sessionStorage after OTP verified
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // On reset step, pre-fill mobile from sessionStorage
  useEffect(() => {
    if (step === "reset") {
      const stored = sessionStorage.getItem("pb_fp_verified");
      if (!stored) {
        // Guard: if no verified OTP found, go back to start
        router.replace("/auth/forgot-password");
      }
    }
  }, [step, router]);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const m = mobile.trim();
    if (!/^\d{10}$/.test(m)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setSending(true);
    setError("");
    try {
      await api.sendForgotPasswordOtp(m);
      // Navigate to OTP screen — always show "sent" regardless (prevents enumeration)
      router.push(
        `/auth/verify-otp?purpose=forgot_password&mobile=${encodeURIComponent(m)}`
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setError("Too many OTP requests. Please wait 15 minutes and try again.");
      } else {
        // Treat everything else as success to prevent mobile enumeration
        router.push(
          `/auth/verify-otp?purpose=forgot_password&mobile=${encodeURIComponent(m)}`
        );
      }
    } finally {
      setSending(false);
    }
  }

  // ── Step 2: reset password ────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(newPw)) { toast.error("Password must contain at least one uppercase letter"); return; }
    if (!/\d/.test(newPw)) { toast.error("Password must contain at least one number"); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(newPw)) {
      toast.error("Password must contain at least one special character");
      return;
    }

    const stored = sessionStorage.getItem("pb_fp_verified");
    if (!stored) {
      toast.error("Session expired. Please start over.");
      router.replace("/auth/forgot-password");
      return;
    }
    const { mobile_number, otp } = JSON.parse(stored);

    setResetting(true);
    setError("");
    try {
      await api.resetPasswordMobile({ mobile_number, otp, new_password: newPw });
      sessionStorage.removeItem("pb_fp_verified");
      setDone(true);
      setTimeout(() => router.replace("/auth/login"), 3000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to reset password. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  // ── Render: reset step ────────────────────────────────────────────────────
  if (step === "reset") {
    if (done) {
      return (
        <div className="text-center py-4">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-surface-900 mb-2">Password updated!</h1>
          <p className="text-sm text-surface-500 mb-1">Your password has been changed successfully.</p>
          <p className="text-xs text-surface-400 mb-6">Redirecting to login…</p>
          <Link href="/auth/login" className="btn-primary w-full flex items-center justify-center">
            Go to login
          </Link>
        </div>
      );
    }

    return (
      <>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-surface-900">Set new password</h1>
          <p className="text-xs text-surface-400 mt-1">Must be at least 8 characters</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">New password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
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
            <p className="text-xs text-surface-400 mt-1">
              Must include an uppercase letter, a number, and a special character
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Confirm password</label>
            <input
              type={showPw ? "text" : "password"}
              required
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={resetting}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resetting ? "Updating…" : "Update password"}
          </button>
        </form>
      </>
    );
  }

  // ── Render: send OTP step ─────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Phone className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-900">Forgot password?</h1>
          <p className="text-xs text-surface-400">We&apos;ll send a verification code to your mobile</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSendOtp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Mobile Number</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-500 font-medium select-none">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              className="w-full border border-surface-200 rounded-xl pl-12 pr-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending ? "Sending…" : "Send OTP"}
        </button>
      </form>

      <p className="text-sm text-center text-surface-500 mt-6">
        Remember your password?{" "}
        <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function ForgotPasswordPage() {
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
          <Suspense fallback={<PageLoader message="Loading" />}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
