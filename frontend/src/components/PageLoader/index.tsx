"use client";

/**
 * PageLoader — animated full-page loading screen with PriceBasket logo animation.
 *
 * Usage:
 *   <PageLoader />               — default, shows "Comparing prices..."
 *   <PageLoader message="..." /> — custom text
 *   <PageLoader mini />          — small inline spinner only (no full-screen)
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

// Platform brand colours
const PLATFORM_DOTS = [
  { color: "#E6A817", label: "Blinkit",   delay: "0ms"   },
  { color: "#7C3AED", label: "Zepto",     delay: "150ms" },
  { color: "#EA580C", label: "Instamart", delay: "300ms" },
  { color: "#16A34A", label: "BigBasket", delay: "450ms" },
];

// Floating ₹ tags that drift upward around the logo
function FloatingTag({ x, delay, duration }: { x: string; delay: string; duration: string }) {
  return (
    <span
      className="absolute text-brand-600 font-black text-base select-none pointer-events-none"
      style={{
        left: x,
        bottom: "100%",
        animation: `floatTag ${duration} ease-in-out ${delay} infinite`,
        opacity: 0,
      }}
    >
      ₹
    </span>
  );
}

// ── Animated PriceBasket Logo ─────────────────────────────────────────────────
function AnimatedLogo() {
  return (
    <div className="relative flex flex-col items-center" style={{ width: 120 }}>
      {/* Glow rings */}
      <span
        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-brand-200 opacity-25"
        style={{ width: 100, height: 100, animation: "ripple 2s ease-out infinite" }}
      />
      <span
        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-brand-200 opacity-15"
        style={{ width: 100, height: 100, animation: "ripple 2s ease-out 0.7s infinite" }}
      />

      {/* Logo image with bounce */}
      <div
        className="relative z-10 w-[88px] h-[88px] rounded-[22px] bg-white
                   shadow-[0_8px_32px_rgba(234,88,12,0.18)] border border-brand-100
                   flex items-center justify-center overflow-hidden"
        style={{ animation: "logoBounce 1.1s ease-in-out infinite" }}
      >
        {/* Floating ₹ tags */}
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          <FloatingTag x="-6px"  delay="0ms"    duration="2.2s" />
          <FloatingTag x="48%"   delay="750ms"  duration="2.5s" />
          <FloatingTag x="80%"   delay="400ms"  duration="2s"   />
        </div>

        <Image
          src="/pricebasket-logo.png"
          alt="PriceBasket"
          width={64}
          height={64}
          className="object-contain"
          priority
        />
      </div>

      {/* Shadow squish */}
      <div
        className="rounded-full bg-surface-300 mt-1"
        style={{
          width: 44,
          height: 7,
          opacity: 0.35,
          filter: "blur(4px)",
          animation: "shadowSquish 1.1s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// Four animated platform-color dots
function PlatformDots() {
  return (
    <div className="flex items-center gap-2 mt-1" role="status" aria-label="Loading">
      {PLATFORM_DOTS.map((dot) => (
        <span
          key={dot.label}
          title={dot.label}
          className="w-3 h-3 rounded-full inline-block"
          style={{
            backgroundColor: dot.color,
            animation: `dotBounce 1.2s ease-in-out ${dot.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Animated "..." text suffix
function AnimatedEllipsis() {
  return (
    <span className="inline-flex gap-0.5 ml-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1 h-1 rounded-full bg-surface-400"
          style={{
            animation: `dotBounce 1.2s ease-in-out ${i * 180}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ── Mini inline spinner ───────────────────────────────────────────────────────

export function MiniLoader({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-5 h-5 rounded-full border-2 border-brand-200 border-t-brand-600",
        className
      )}
      style={{ animation: "spin 0.7s linear infinite" }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ── Full-page loader ──────────────────────────────────────────────────────────

interface PageLoaderProps {
  message?: string;
  mini?: boolean;
  className?: string;
}

export function PageLoader({ message = "Comparing prices", mini = false, className }: PageLoaderProps) {
  if (mini) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <div className="flex flex-col items-center gap-3">
          <MiniLoader className="w-8 h-8" />
          <span className="text-sm text-surface-400">{message}<AnimatedEllipsis /></span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center",
        "bg-white/97 backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      {/* Animated logo */}
      <AnimatedLogo />

      {/* Brand name with animated gradient */}
      <div className="mt-5 text-center">
        <p
          className="text-2xl font-black tracking-tight select-none"
          style={{ animation: "textPulse 2s ease-in-out infinite" }}
        >
          <span className="text-surface-900">Price</span>
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: "linear-gradient(90deg, #ea580c, #f97316, #ea580c)",
              backgroundSize: "200% 100%",
              animation: "gradientShift 2s ease-in-out infinite",
            }}
          >
            Basket
          </span>
        </p>
        <p className="text-xs text-surface-400 mt-0.5 font-medium tracking-wide">
          Compare · Save · Shop Smart
        </p>
      </div>

      {/* Platform dots + message */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <PlatformDots />
        <p className="text-sm text-surface-500 font-medium flex items-center gap-1.5">
          {message}
          <AnimatedEllipsis />
        </p>
      </div>
    </div>
  );
}
