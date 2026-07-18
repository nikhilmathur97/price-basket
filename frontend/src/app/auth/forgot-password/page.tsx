"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, CheckCircle } from "lucide-react";
import { api } from "@/services/api";
import toast from "react-hot-toast";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      await api.forgotPassword(trimmed);
    } catch {
      // Always show the "sent" state — prevents email enumeration.
    } finally {
      setSending(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-surface-900 mb-2">Check your email</h1>
        <p className="text-sm text-surface-500 mb-6">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/auth/login" className="btn-primary w-full flex items-center justify-center">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Mail className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-900">Forgot password?</h1>
          <p className="text-xs text-surface-400">We&apos;ll email you a link to reset it</p>
        </div>
      </div>

      <form onSubmit={handleSendLink} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending ? "Sending…" : "Send reset link"}
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
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
