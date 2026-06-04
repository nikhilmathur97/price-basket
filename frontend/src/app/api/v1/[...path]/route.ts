/**
 * Catch-all proxy: forwards every /api/v1/* request to the backend.
 * Uses Node.js runtime — Edge Runtime blocks outbound calls to private IPs.
 *
 * Cache strategy:
 * - Read-only GET endpoints (featured, categories, search, product) pass through
 *   the backend's Cache-Control header so Vercel CDN caches them at the edge.
 * - Mutating requests (POST/PUT/PATCH/DELETE) are never cached.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// BACKEND_URL is set in Vercel project env → AWS ALB.
// Falls back to custom domain for local dev.
const BACKEND =
  process.env.BACKEND_URL ?? "https://api.test2.pricebasket.in";

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

function isCacheable(method: string, path: string): boolean {
  if (method !== "GET") return false;
  return CACHEABLE_PATHS.some((re) => re.test(path));
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = `${BACKEND}/api/v1/${pathStr}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : req.body;

  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
    // Required to forward the readable stream body
    // @ts-expect-error — Node.js fetch accepts ReadableStream
    duplex: "half",
  });

  const resHeaders = new Headers(res.headers);
  // Remove hop-by-hop headers that must not be forwarded
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");

  // Preserve backend Cache-Control for cacheable GET endpoints.
  // Vercel overrides Cache-Control on serverless responses by default;
  // explicitly setting it here forces Vercel CDN to respect it.
  if (isCacheable(req.method, pathStr)) {
    const backendCC = res.headers.get("cache-control");
    if (backendCC) {
      resHeaders.set("cache-control", backendCC);
      // CDN-Cache-Control is Vercel-specific: controls edge cache independently
      // of the browser cache. This makes Vercel cache the response at the edge.
      resHeaders.set("cdn-cache-control", backendCC);
    } else {
      // Fallback: cache for 60s at edge if backend didn't send a header
      resHeaders.set("cache-control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
      resHeaders.set("cdn-cache-control", "public, max-age=60, stale-while-revalidate=300");
    }
  } else {
    // Never cache mutating or auth-sensitive responses
    resHeaders.set("cache-control", "private, no-store");
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
