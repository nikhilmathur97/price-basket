"use client";

/**
 * TopProgressBar — thin green progress bar at the very top of the page.
 * Shown during Next.js App Router navigation (pathname changes).
 * No extra packages needed.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const prevPathRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Don't trigger on first mount — only on subsequent navigation
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Clear any in-flight animation
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Start: show bar at 0 → animate quickly to 85%
    setWidth(0);
    setVisible(true);

    // Ramp to 85% fast, then to 100% and hide
    rafRef.current = requestAnimationFrame(() => {
      setWidth(72);

      timerRef.current = setTimeout(() => {
        setWidth(100);
        // Hide after finish animation completes (300ms)
        timerRef.current = setTimeout(() => {
          setVisible(false);
          setWidth(0);
        }, 350);
      }, 400);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-brand-600 rounded-r-full shadow-[0_0_8px_rgba(12,131,31,0.6)]"
        style={{
          width: `${width}%`,
          transition: width === 100
            ? "width 0.25s ease-out"
            : "width 0.45s cubic-bezier(0.1, 0.6, 0.4, 1)",
        }}
      />
    </div>
  );
}
