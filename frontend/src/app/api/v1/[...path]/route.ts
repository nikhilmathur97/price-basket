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

function isCacheable(method: string, path: string): boolean {
  if (method !== "GET") return false;
  return CACHEABLE_PATHS.some((re) => re.test(path));
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = `${BACKEND}/api/v1/${pathStr}${req.nextUrl.search}`;

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

  const res = await fetch(url, {
    method: req.method,
    headers: reqHeaders,
    body: body ? body : undefined,
  });

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
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
