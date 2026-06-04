"use client";

/**
 * CommunityPopup
 * ==============
 * Shows a non-intrusive slide-up popup after 30 seconds on the page
 * inviting users to join the Telegram / WhatsApp deal channel.
 *
 * • Dismissed state persisted in localStorage — never shows again after dismiss.
 * • Shown at most once per session even without explicit dismiss.
 * • Controlled by NEXT_PUBLIC_TELEGRAM_URL / NEXT_PUBLIC_WHATSAPP_URL env vars.
 *   If neither is set the component renders nothing.
 */

import { useEffect, useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "pb_community_popup_dismissed";
const DELAY_MS = 30_000; // 30 seconds

export function CommunityPopup() {
  const [visible, setVisible] = useState(false);

  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "";
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "";
  const hasChannel = Boolean(telegramUrl || whatsappUrl);

  useEffect(() => {
    // Don't show if no channels configured
    if (!hasChannel) return;
    // Already dismissed — never show again
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }

  function handleTelegram() {
    track.joinCommunity("telegram");
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
    dismiss();
  }

  function handleWhatsApp() {
    track.joinCommunity("whatsapp");
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    dismiss();
  }

  if (!visible || !hasChannel) return null;

  return (
    <div
      role="dialog"
      aria-label="Join PriceBasket community"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-2rem)] max-w-sm
                 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-slide-up"
    >
      {/* Close */}
      <button
        onClick={dismiss}
        aria-label="Close"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={18} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shrink-0">
          🛒
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            Get daily grocery deals — FREE
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Best prices from Blinkit, Zepto & more — every day
          </p>
        </div>
      </div>

      {/* Savings proof */}
      <div className="bg-orange-50 rounded-xl px-3 py-2 mb-3 text-xs text-orange-800 font-medium">
        💰 Average saving: <span className="font-bold">₹340 per order</span> — join 10,000+ smart shoppers
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2">
        {telegramUrl && (
          <button
            onClick={handleTelegram}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#229ED9] hover:bg-[#1a8bbf]
                       text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            <Send size={14} />
            Telegram
          </button>
        )}
        {whatsappUrl && (
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1db954]
                       text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            <MessageCircle size={14} />
            WhatsApp
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-gray-400 mt-2">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
