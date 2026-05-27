"use client";
/**
 * BackendWarmup
 * ─────────────────────────────────────────────────────────────────────────────
 * Invisible component that fires a /health ping the instant the browser loads
 * ANY page. This starts the Render cold-start wake-up process before React
 * Query or any product fetch even initialises — shaving 3-8 seconds off the
 * first visible data load.
 *
 * - Renders nothing (returns null)
 * - Never throws (errors are intentionally swallowed)
 * - Added once in root layout so it fires on every page visit
 */
import { useEffect } from "react";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? "https://pricebasket-api.onrender.com";

export function BackendWarmup() {
  useEffect(() => {
    // Fire-and-forget — just start the wake-up, don't wait for the response
    fetch(`${BACKEND}/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  return null;
}
