/**
 * Catch-all proxy: forwards every /api/v1/* request to the backend.
 * Uses Node.js runtime — Edge Runtime blocks outbound calls to private IPs.
 *
 * Cache strategy:
 * - Read-only GET endpoints (featured, categories, search, product) pass through
 *   the backend's Cache-Control header so Vercel CDN caches them at the edge.
 * - Mutating requests (POST/PUT/PATCH/DELETE) are never cached.
 *
 * Reliability:
 * - Auth endpoints (login/register) get up to 2 retries with a 25 s timeout each
 *   to survive Render free-tier cold starts (~15–30 s).
 * - All other endpoints get a single attempt with a 20 s timeout.
 * - On fetch failure (network error / timeout) the proxy returns a structured
 *   JSON 503 so the browser always gets an HTTP response — never a raw network
 *   error — which prevents the "Cannot reach server" Axios network-error path.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// BACKEND_URL is set in Vercel project env → Render backend.
// Falls back to the Render URL directly if the env var is missing or empty
// (|| not ?? so an empty-string env var also falls through to the default).
const BACKEND = (
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "https://pricebasket-api.onrender.com"
).replace(/\/$/, "");

// Paths whose GET responses should be cached at Vercel's CDN edge.
// The backend already sends Cache-Control headers; we preserve them here.
const CACHEABLE_PATHS = [
  /^products\/featured/,
  /^products\/categories/,
  /^products\/sitemap/,
  /^products\/[0-9a-f-]{36}$/,  // single product
  /^products\?/,                 // search
  /^products$/,                  // search (no query string)
];

// Auth paths that may need extra time for Render cold-start warm-up.
const AUTH_PATHS = /^auth\/(login|register|refresh)/;

function isCacheable(method: string, path: string): boolean {
  if (method !== "GET") return false;
  return CACHEABLE_PATHS.some((re) => re.test(path));
}

/**
 * Fetch with an AbortController timeout.
 * Returns the Response on success, throws on network error or timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = `${BACKEND}/api/v1/${pathStr}${req.nextUrl.search}`;

  // Auth endpoints: allow up to 2 retries with 25 s each (Render cold start).
  // All other endpoints: 1 attempt with 20 s timeout.
  const isAuth = AUTH_PATHS.test(pathStr);
  const timeoutMs = isAuth ? 25_000 : 20_000;
  const maxAttempts = isAuth ? 2 : 1;

  // Forward request headers but strip hop-by-hop headers
  const reqHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!["host", "connection", "transfer-encoding", "te", "trailer", "upgrade"].includes(lower)) {
      reqHeaders.set(key, value);
    }
  });
  // Always request uncompressed from backend — proxy handles compression itself
  reqHeaders.set("accept-encoding", "identity");

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: req.method,
          headers: reqHeaders,
          body: body ? body : undefined,
        },
        timeoutMs
      );

      // Read body as buffer — more reliable than streaming in serverless
      const responseBody = await res.arrayBuffer();

      const resHeaders = new Headers();
      res.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        // Strip hop-by-hop and encoding headers (we're sending raw buffer)
        if (!["transfer-encoding", "connection", "content-encoding", "te", "trailer", "upgrade"].includes(lower)) {
          resHeaders.set(key, value);
        }
      });

      // Set correct content-length for the uncompressed buffer
      resHeaders.set("content-length", String(responseBody.byteLength));

      // Preserve backend Cache-Control for cacheable GET endpoints.
      if (isCacheable(req.method, pathStr)) {
        const backendCC = res.headers.get("cache-control");
        if (backendCC) {
          resHeaders.set("cache-control", backendCC);
          resHeaders.set("cdn-cache-control", backendCC);
        } else {
          resHeaders.set("cache-control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
          resHeaders.set("cdn-cache-control", "public, max-age=60, stale-while-revalidate=300");
        }
      } else {
        resHeaders.set("cache-control", "private, no-store");
      }

      return new NextResponse(responseBody, {
        status: res.status,
        headers: resHeaders,
      });
    } catch (err: unknown) {
      lastError = err;
      // Only retry on network/timeout errors, not on successful HTTP error responses
      if (attempt < maxAttempts) {
        // Brief pause before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // All attempts failed — return a structured 503 so Axios always gets an HTTP
  // response (err.response defined) instead of a raw network error.
  const isTimeout =
    lastError instanceof Error &&
    (lastError.name === "AbortError" || lastError.message?.includes("abort"));

  const detail = isTimeout
    ? "The server is taking too long to respond. It may be starting up — please try again in a few seconds."
    : "Cannot reach the backend server. Please try again.";

  console.error(`[proxy] ${req.method} ${pathStr} failed after ${maxAttempts} attempt(s):`, lastError);

  return NextResponse.json(
    { detail },
    {
      status: 503,
      headers: { "cache-control": "private, no-store" },
    }
  );
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
