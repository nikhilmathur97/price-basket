/**
 * /api/keepalive — health check endpoint (optionally called by cron or monitoring)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pings the AWS ECS backend /ping endpoint to verify it is reachable.
 * ECS Fargate is always-on (no cold starts), so this is purely a health check.
 *
 * Security: Vercel automatically adds a `Authorization: Bearer <CRON_SECRET>`
 * header to cron requests. We verify it to prevent abuse.
 */
import { NextResponse } from "next/server";

// Server-side: use BACKEND_URL (set in Vercel env → AWS ALB).
// Falls back to NEXT_PUBLIC_API_URL, then to the ALB DNS directly.
const BACKEND =
  process.env.BACKEND_URL ??
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://pricebasket-alb-72968209.ap-south-1.elb.amazonaws.com";

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
