/**
 * /api/keepalive — backend warm-up + health check
 * ─────────────────────────────────────────────────────────────────────────────
 * Called by two sources:
 *   1. Vercel Cron (every 5 min via vercel.json) — keeps Render free-tier warm
 *      so users never hit a cold start. Vercel adds Authorization: Bearer <CRON_SECRET>.
 *   2. UptimeRobot (every 5 min) — external uptime monitoring. No auth header.
 *      UptimeRobot monitors: https://pricebasket.in/api/keepalive
 *      Expected response: HTTP 200 with JSON { ok: true }
 *
 * Security: open to GET without auth so UptimeRobot works. The endpoint only
 * reads (pings the backend) — it never mutates data — so no auth is needed.
 * CRON_SECRET is only checked when present to validate Vercel cron calls.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Node runtime: supports longer timeouts than Edge

const BACKEND = (
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "https://pricebasket-api.onrender.com"
).replace(/\/$/, "");

// Try /health first (standard), fall back to /ping (legacy)
const PING_URLS = [`${BACKEND}/health`, `${BACKEND}/ping`];

export async function GET(request: Request) {
  // If CRON_SECRET is set, validate Vercel cron calls — but allow requests
  // without the header (UptimeRobot, manual browser checks, etc.).
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  let backendStatus = 0;
  let ok = false;
  let pingedUrl = PING_URLS[0];
  let error: string | null = null;

  // Try each ping URL in order; stop at the first success
  for (const url of PING_URLS) {
    pingedUrl = url;
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000), // 15 s — enough for Render cold start
        headers: {
          "User-Agent": "PriceBasket-Keepalive/1.0 (+https://pricebasket.in)",
        },
      });
      backendStatus = res.status;
      ok = res.ok;
      if (ok) {
        error = null;
        break; // success — no need to try the next URL
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`[keepalive] ping failed for ${url}:`, err);
    }
  }

  const latencyMs = Date.now() - start;

  if (!ok) {
    console.warn(`[keepalive] backend unreachable — status=${backendStatus} error=${error}`);
  }

  // Always return HTTP 200 to UptimeRobot — the JSON body carries the real status.
  // UptimeRobot keyword monitor: look for "ok":true to detect real downtime.
  return NextResponse.json(
    {
      ok,
      pinged: pingedUrl,
      backendStatus,
      latencyMs,
      error: error ?? undefined,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200, // always 200 so UptimeRobot HTTP check passes; use keyword monitor for real status
      headers: { "Cache-Control": "no-store" },
    }
  );
}
