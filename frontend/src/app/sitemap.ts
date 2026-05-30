import { MetadataRoute } from "next";

import {
  SITE_URL,
  fetchSitemapProducts,
  getAllPosts,
} from "@/lib/server-api";
import { FEATURED_MATCHUPS } from "@/lib/platforms";

// Revalidate the sitemap every 6 hours so newly added products & posts get
// discovered without rebuilding the whole site.
export const revalidate = 21600;

const CATEGORY_SLUGS = [
  "fruits-vegetables",
  "dairy-breakfast",
  "snacks-drinks",
  "staples",
  "household",
  "personal-care",
  "oils-spices",
  "bakery",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const now = new Date();

  // ── Static / marketing routes ──────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    // Core pages — highest priority
    { url: base,                                  lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/search`,                      lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/best-grocery-deals`,          lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/save-money-groceries`,        lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/blog`,                        lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    // Feature pages
    { url: `${base}/alerts`,                      lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/cart`,                        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Business pages
    { url: `${base}/advertise`,                   lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/partner`,                     lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press`,                       lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Auth
    { url: `${base}/auth/login`,                  lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/auth/signup`,                 lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Legal
    { url: `${base}/privacy`,                     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,                       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  // ── Compare pages — high SEO priority (target 90K+ searches/month) ──────
  const compareRoutes: MetadataRoute.Sitemap = FEATURED_MATCHUPS.map(([a, b], i) => ({
    url: `${base}/compare/${a}-vs-${b}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    // First 5 matchups are highest volume — give them 0.95 priority
    priority: i < 5 ? 0.95 : 0.85,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug, i) => ({
    url: `${base}/search?category=${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: i < 4 ? 0.8 : 0.7,
  }));

  // ── Dynamic: products + blog posts (fail-safe — empty on backend error) ──
  const [products, posts] = await Promise.all([
    fetchSitemapProducts(),
    getAllPosts(),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/product/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.isoDate ? new Date(p.isoDate) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...compareRoutes,   // compare pages before categories — higher SEO value
    ...categoryRoutes,
    ...blogRoutes,
    ...productRoutes,
  ];
}
