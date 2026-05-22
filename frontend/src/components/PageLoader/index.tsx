"use client";

/**
 * PageLoader — animated full-page loading screen
 *
 * Usage:
 *   <PageLoader />               — default, shows "Comparing prices..."
 *   <PageLoader message="..." /> — custom text
 *   <PageLoader mini />          — small inline spinner only (no full-screen)
 */

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

// Cart character with bounce + shadow squish
function CartCharacter() {
  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: 96, height: 96 }}>
      {/* Glow ring */}
      <span
        className="absolute inset-0 rounded-full bg-brand-200 opacity-30"
        style={{ animation: "ripple 1.8s ease-out infinite" }}
      />
      <span
        className="absolute inset-0 rounded-full bg-brand-200 opacity-20"
        style={{ animation: "ripple 1.8s ease-out 0.6s infinite" }}
      />

      {/* Cart icon wrapper */}
      <div
        className="relative z-10 w-20 h-20 bg-white rounded-2xl shadow-hover border border-brand-100
                   flex items-center justify-center"
        style={{ animation: "cartBounce 0.9s ease-in-out infinite" }}
      >
        {/* ₹ floating tags */}
        <div className="absolute inset-0 overflow-visible">
          <FloatingTag x="-8px"  delay="0ms"    duration="2s"   />
          <FloatingTag x="50%"   delay="700ms"  duration="2.3s" />
          <FloatingTag x="82%"   delay="400ms"  duration="1.8s" />
        </div>

        {/* Shopping basket SVG */}
        <svg
          viewBox="0 0 24 24"
          className="w-10 h-10"
          fill="none"
          stroke="#ea580c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>

      {/* Shadow squish beneath cart — grows when cart comes down */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-surface-200"
        style={{
          width: 40,
          height: 6,
          animation: "cartBounce 0.9s ease-in-out infinite",
          transform: "scaleX(1)",
          opacity: 0.4,
          filter: "blur(3px)",
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

// ── Mini inline spinner (for search / data fetch states) ─────────────────────

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
        "bg-white/95 backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      {/* Character */}
      <CartCharacter />

      {/* Brand name */}
      <div className="mt-6 text-center">
        <p className="text-xl font-black tracking-tight text-surface-900">
          Price<span className="text-brand-600">Basket</span>
        </p>
        <p className="text-xs text-surface-400 mt-1 font-medium">
          Compare · Save · Redirect
        </p>
      </div>

      {/* Platform dots */}
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
