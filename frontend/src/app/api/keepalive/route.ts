/**
 * /api/keepalive — Vercel Cron Job endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs every 10 minutes (configured in vercel.json) to ping the Render backend
 * and prevent it from going idle (Render free tier sleeps after 15 min).
 *
 * This is a server-side belt-and-suspenders complement to the client-side
 * BackendWarmup component — it keeps the backend warm even when no users
 * are actively browsing.
 *
 * Security: Vercel automatically adds a `Authorization: Bearer <CRON_SECRET>`
 * header to cron requests. We verify it to prevent abuse.
 */
import { NextResponse } from "next/server";

const BACKEND =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "https://pricebasket-api.onrender.com";

export const runtime = "edge"; // Edge runtime: lowest latency, no cold start

export async function GET(request: Request) {
  // Verify this is a legitimate Vercel cron call (or internal call)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  let backendStatus = 0;
  let ok = false;

  try {
    const res = await fetch(`${BACKEND}/ping`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000), // 10 s timeout
    });
    backendStatus = res.status;
    ok = res.ok;
  } catch (err) {
    // Backend is down / cold starting — log but don't fail the cron
    console.error("[keepalive] ping failed:", err);
  }

  const latencyMs = Date.now() - start;

  return NextResponse.json(
    {
      pinged: BACKEND,
      backendStatus,
      ok,
      latencyMs,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        // Never cache cron responses
        "Cache-Control": "no-store",
      },
    }
  );
}
