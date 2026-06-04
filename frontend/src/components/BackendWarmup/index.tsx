"use client";
/**
 * BackendWarmup
 * ─────────────────────────────────────────────────────────────────────────────
 * Keeps the ECS backend warm by pinging /ping periodically.
 * ECS Fargate is always-on (no cold starts), but this ensures the ALB
 * health check path stays active and the featured-products Redis cache
 * is pre-warmed on every page load.
 *
 * Strategy:
 *   1. Fire an immediate /ping on mount.
 *   2. Re-ping every 5 minutes while the tab is open.
 *   3. Re-ping on visibilitychange (user returns after switching tabs).
 *
 * - Renders nothing (returns null)
 * - Never throws (errors are intentionally swallowed)
 * - Added once in root layout so it fires on every page visit
 */
import { useEffect } from "react";

// NEXT_PUBLIC_API_URL must be set in Vercel env vars to the AWS ALB URL.
// Fallback: use the Vercel proxy route so it works even without the env var.
const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? "";

// Use relative /api/v1/ping when no explicit backend URL is set
// (goes through Vercel proxy → ALB). Use direct URL when set.
const PING_URL = BACKEND
  ? `${BACKEND}/ping`
  : "/api/v1/ping";

// Ping every 5 minutes (ECS is always-on, just keeping cache warm)
const KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;

function ping() {
  fetch(PING_URL, {
    method: "GET",
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
}

export function BackendWarmup() {
  useEffect(() => {
    // 1. Immediate ping — pre-warm Redis cache
    ping();

    // 2. Periodic keep-alive
    const interval = setInterval(ping, KEEPALIVE_INTERVAL_MS);

    // 3. Re-ping when tab becomes visible
    function onVisible() {
      if (document.visibilityState === "visible") {
        ping();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
