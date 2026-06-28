"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, RefreshCw, Phone } from "lucide-react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { PageLoader } from "@/components/PageLoader";
import toast from "react-hot-toast";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

function OTPInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function handleKey(
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const next = [...value];
        next[idx] = "";
        onChange(next);
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) {
      refs.current[idx + 1]?.focus();
    }
  }

  function handleChange(raw: string, idx: number) {
    // Handle paste of full OTP
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = [...value];
      for (let i = 0; i < OTP_LENGTH; i++) {
        next[i] = digits[i] ?? "";
      }
      onChange(next);
      refs.current[Math.min(digits.length, OTP_LENGTH) - 1]?.focus();
      return;
    }
    const digit = digits.slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < OTP_LENGTH - 1) {
      refs.current[idx + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    onChange(next);
    refs.current[Math.min(text.length, OTP_LENGTH) - 1]?.focus();
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value, i)}
          onKeyDown={(e) => handleKey(e, i)}
          className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                      transition-colors disabled:opacity-50
                      ${value[i] ? "border-brand-500 bg-brand-50" : "border-surface-200"}`}
        />
      ))}
    </div>
  );
}

function VerifyOTPForm() {
  const router = useRouter();
  const params = useSearchParams();
  const purpose = params.get("purpose") as "signup" | "forgot_password" | null;
  const mobile = params.get("mobile") ?? "";

  const { setUser, setAccessToken } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard: if no mobile/purpose, redirect back
  useEffect(() => {
    if (!mobile || !purpose) {
      router.replace("/auth/signup");
    }
  }, [mobile, purpose, router]);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function resetTimer() {
    setCountdown(RESEND_SECONDS);
  }

  const otpString = otp.join("");
  const isComplete = otpString.length === OTP_LENGTH;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete || loading) return;
    setLoading(true);

    try {
      if (purpose === "signup") {
        const pending = sessionStorage.getItem("pb_signup_pending");
        if (!pending) {
          toast.error("Session expired. Please start over.");
          router.replace("/auth/signup");
          return;
        }
        const { full_name, mobile_number, password, email } = JSON.parse(pending);

        const { data } = await api.verifySignupOtp({
          mobile_number,
          otp: otpString,
          full_name,
          password,
          email,
        });

        sessionStorage.removeItem("pb_signup_pending");
        setAccessToken(data.access_token);
        let user = data.user;
        if (!user) {
          const meRes = await api.me();
          user = meRes.data;
        }
        setUser(user);
        setSuccess(true);
        toast.success(`Welcome to PriceBasket, ${user.full_name ?? "there"}!`);
        resetCart();
        fetchCart().catch(() => {});
        setTimeout(() => router.replace("/"), 1200);
      } else if (purpose === "forgot_password") {
        // For forgot password: store verified mobile + OTP in sessionStorage for reset page
        sessionStorage.setItem(
          "pb_fp_verified",
          JSON.stringify({ mobile_number: mobile, otp: otpString })
        );
        router.replace("/auth/forgot-password?step=reset");
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Incorrect OTP. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      if (purpose === "signup") {
        await api.sendSignupOtp(mobile);
      } else {
        await api.sendForgotPasswordOtp(mobile);
      }
      setOtp(Array(OTP_LENGTH).fill(""));
      resetTimer();
      toast.success("New OTP sent!");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  const maskedMobile = mobile ? `+91 XXXXXXX${mobile.slice(-3)}` : "";

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-surface-900 mb-2">Account created!</h2>
        <p className="text-sm text-surface-500">Redirecting you to PriceBasket…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-6">
      {/* Masked mobile display */}
      <div className="flex items-center gap-2 justify-center text-sm text-surface-600">
        <Phone className="w-4 h-4 text-brand-600" />
        <span>Code sent to <span className="font-semibold">{maskedMobile}</span></span>
      </div>

      {/* OTP boxes */}
      <OTPInput value={otp} onChange={setOtp} disabled={loading} />

      {/* Verify button */}
      <button
        type="submit"
        disabled={!isComplete || loading}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Verifying…
          </span>
        ) : (
          "Verify OTP"
        )}
      </button>

      {/* Resend */}
      <div className="text-center text-sm text-surface-500">
        {countdown > 0 ? (
          <span>Resend OTP in <span className="font-semibold text-surface-700">{countdown}s</span></span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-brand-600 font-semibold hover:underline disabled:opacity-60"
          >
            {resendLoading ? "Sending…" : "Resend OTP"}
          </button>
        )}
      </div>

      {/* Change number */}
      <div className="text-center text-xs text-surface-400">
        Wrong number?{" "}
        <Link
          href={purpose === "signup" ? "/auth/signup" : "/auth/forgot-password"}
          className="text-brand-600 hover:underline"
        >
          Change mobile number
        </Link>
      </div>
    </form>
  );
}

export default function VerifyOTPPage() {
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
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-surface-900 mb-1">Verify Mobile Number</h1>
            <p className="text-sm text-surface-400">Enter the 6-digit code we sent you</p>
          </div>

          <Suspense fallback={<PageLoader message="Loading" />}>
            <VerifyOTPForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
