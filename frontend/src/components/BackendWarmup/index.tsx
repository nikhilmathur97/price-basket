"use client";
/**
 * BackendWarmup
 * ─────────────────────────────────────────────────────────────────────────────
 * Keeps the Render free-tier backend permanently warm so users never hit a
 * cold start (which takes 30-60 s on Render free tier).
 *
 * Strategy:
 *   1. Fire an immediate /ping on mount (starts wake-up before React Query).
 *   2. Fire a second /ping after 5 s (catches cases where first ping timed out).
 *   3. Re-ping every 9 minutes while the tab is open (Render idles after 15 min).
 *   4. Re-ping on visibilitychange (tab becomes visible again after being hidden).
 *
 * - Renders nothing (returns null)
 * - Never throws (errors are intentionally swallowed)
 * - Added once in root layout so it fires on every page visit
 */
import { useEffect } from "react";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? "https://pricebasket-api.onrender.com";

// Use /ping (lightweight, no logging) instead of /health
const PING_URL = `${BACKEND}/ping`;

// How often to re-ping while the tab is open (9 min < Render's 15 min idle timeout)
const KEEPALIVE_INTERVAL_MS = 9 * 60 * 1000;

function ping() {
  fetch(PING_URL, {
    method: "GET",
    cache: "no-store",
    // keepalive: true ensures the request completes even if the page unloads
    keepalive: true,
  }).catch(() => {});
}

export function BackendWarmup() {
  useEffect(() => {
    // 1. Immediate ping — start wake-up right away
    ping();

    // 2. Second ping after 5 s — catches cases where the first was dropped
    const t1 = setTimeout(ping, 5_000);

    // 3. Periodic keep-alive — prevents Render from sleeping while tab is open
    const interval = setInterval(ping, KEEPALIVE_INTERVAL_MS);

    // 4. Re-ping when tab becomes visible (user returns after switching tabs)
    function onVisible() {
      if (document.visibilityState === "visible") {
        ping();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(t1);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
