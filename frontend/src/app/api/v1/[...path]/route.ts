/**
 * Catch-all proxy: forwards every /api/v1/* request to the backend.
 * Uses Node.js runtime — Edge Runtime blocks outbound calls to Render
 * (DNS_HOSTNAME_RESOLVED_PRIVATE error).
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// BACKEND_URL is set in Vercel project env; falls back to Render public URL.
const BACKEND =
  process.env.BACKEND_URL ?? "https://pricebasket-api.onrender.com";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${BACKEND}/api/v1/${path.join("/")}${req.nextUrl.search}`;

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
