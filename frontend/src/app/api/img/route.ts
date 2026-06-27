import { NextRequest, NextResponse } from "next/server";

// ── Image proxy ───────────────────────────────────────────────────────────────
// Proxies external product images (cdn.grofers.com, cdn.zeptonow.com, etc.)
// through our own domain to avoid:
//   1. CDN hotlink protection (vary: Origin blocks direct browser requests)
//   2. Vercel /_next/image 402 quota exhaustion on Hobby plan
//
// Usage: /api/img?url=https%3A%2F%2Fcdn.grofers.com%2F...
// Cache: 24 h at CDN edge, 7 days stale-while-revalidate

const ALLOWED_HOSTS = [
  "cdn.grofers.com",
  "cdn.blinkit.com",
  "assets.blinkit.com",
  "cdn.zeptonow.com",
  "media-assets.swiggy.com",
  "www.bigbasket.com",
  "bb-website-live.s3.amazonaws.com",
  "bb-website-live.s3.ap-south-1.amazonaws.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "static-assets-web.flixcart.com",
  "rukminim1.fliximg.com",
  "rukminim2.fliximg.com",
  "www.jiomart.com",
  "images.pexels.com",
  "pricebasket-assets.s3.ap-south-1.amazonaws.com",
  "pricebasket-assets.s3.amazonaws.com",
];

function isAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !isAllowed(url)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        // Mimic a browser request from Blinkit's own domain so CDN hotlink
        // protection doesn't block us
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://blinkit.com/",
        Origin: "https://blinkit.com",
      },
      // 8 s timeout — product images should load fast
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return new NextResponse("Bad Gateway", { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache 24 h at Vercel CDN edge, 7 days stale-while-revalidate
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
        // Allow browser to cache for 24 h
        "CDN-Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Gateway Timeout", { status: 504 });
  }
}
