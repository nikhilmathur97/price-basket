/**
 * Server-side data fetching for SEO (generateMetadata, sitemap, programmatic pages).
 *
 * These run in Server Components / route handlers only — never shipped to the
 * browser — so we use native fetch (cacheable by Next) against the backend.
 * The browser client (src/services/api.ts) is unaffected.
 */

import type { ProductWithPrices } from "@/types";
import { STATIC_POSTS, getStaticPost, type BlogPost } from "@/lib/blog";

// Server-side: use BACKEND_URL (set in Vercel env → Render backend).
// Falls back to API_URL / NEXT_PUBLIC_API_URL, then the Render URL directly
// (|| not ?? so an empty-string env var also falls through to the default).
// These run in Server Components / route handlers — never shipped to browser.
const BACKEND =
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pricebasket-api.onrender.com";

export const API_BASE = `${BACKEND.replace(/\/$/, "")}/api/v1`;
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pricebasket.in"
).replace(/\/$/, "");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): boolean {
  return !!value && UUID_RE.test(value);
}

/** Lightweight entry returned by the backend sitemap endpoint. */
export interface SitemapEntry {
  slug: string;
  id: string;
  updated_at: string | null;
}

/**
 * Fetch a single product server-side. Returns null on any error (404, 5xx,
 * network) so callers can fall back to generic metadata rather than crashing
 * the render.
 */
export async function fetchProduct(
  id: string,
): Promise<ProductWithPrices | null> {
  if (!isUuid(id)) return null; // mock/demo products have no backend record
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      // Revalidate hourly — prices change but product identity is stable,
      // and SEO crawlers don't need second-by-second freshness.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ProductWithPrices;
  } catch {
    return null;
  }
}

/**
 * Fetch the full product list for the sitemap. Returns [] on failure so the
 * sitemap still renders with static routes.
 */
export async function fetchSitemapProducts(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/products/sitemap`, {
      next: { revalidate: 21600 }, // 6h — sitemap freshness is not time-critical
    });
    if (!res.ok) return [];
    const data = (await res.json()) as SitemapEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Strip HTML / collapse whitespace and clamp to `max` chars for meta descriptions. */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

// ── Blog: auto-generated posts from the backend content engine ──────────────
// The backend Celery task publishes daily deal/price-drop articles to
// /content/blog. Until that endpoint is live these fetchers return empty and
// the blog falls back to the static curated posts — so the frontend never
// breaks waiting on the backend.

export async function fetchGeneratedPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE}/content/blog`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as BlogPost[];
    return Array.isArray(data)
      ? data.map((p) => ({ ...p, generated: true }))
      : [];
  } catch {
    return [];
  }
}

export async function fetchGeneratedPost(
  slug: string,
): Promise<BlogPost | null> {
  try {
    const res = await fetch(
      `${API_BASE}/content/blog/${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as BlogPost;
    return { ...data, generated: true };
  } catch {
    return null;
  }
}

/** All posts (curated + generated), newest first — for the blog listing & sitemap. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const generated = await fetchGeneratedPosts();
  const all = [...generated, ...STATIC_POSTS];
  return all.sort(
    (a, b) => +new Date(b.isoDate) - +new Date(a.isoDate),
  );
}

/** Resolve a single post by slug from either source. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  return getStaticPost(slug) ?? (await fetchGeneratedPost(slug));
}
