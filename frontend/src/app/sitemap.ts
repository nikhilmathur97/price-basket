import { MetadataRoute } from "next";

import {
  SITE_URL,
  fetchSitemapProducts,
  getAllPosts,
} from "@/lib/server-api";
import { FEATURED_MATCHUPS } from "@/lib/platforms";
import { CITY_SLUGS, PRODUCT_SLUGS } from "@/lib/city-product-data";
import { DEAL_PLATFORM_SLUGS } from "@/lib/deals-data";

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

// High-intent product SEO pages — each targets a specific buyer-intent keyword
const PRODUCT_SEO_PAGES = [
  { slug: "cheapest-atta-online",     priority: 0.92 },
  { slug: "cheapest-milk-online",     priority: 0.92 },
  { slug: "cheapest-oil-online",      priority: 0.92 },
  { slug: "cheapest-rice-online",     priority: 0.92 },
  { slug: "cheapest-dal-online",      priority: 0.92 },
  { slug: "cheapest-sugar-online",    priority: 0.90 },
  { slug: "cheapest-ghee-online",     priority: 0.90 },
  { slug: "cheapest-eggs-online",     priority: 0.90 },
  { slug: "best-grocery-deals",       priority: 0.95 },
  { slug: "save-money-groceries",     priority: 0.90 },
];

// City pages — local SEO targeting "grocery prices [city]"
const CITY_PAGES = [
  { slug: "grocery-prices-mumbai",    priority: 0.90 },
  { slug: "grocery-prices-delhi",     priority: 0.90 },
  { slug: "grocery-prices-bangalore", priority: 0.90 },
  { slug: "grocery-prices-hyderabad", priority: 0.87 },
  { slug: "grocery-prices-chennai",   priority: 0.87 },
  { slug: "grocery-prices-pune",      priority: 0.87 },
  { slug: "grocery-prices-kolkata",   priority: 0.87 },
  { slug: "grocery-prices-ahmedabad", priority: 0.85 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const now = new Date();

  // ── Static / marketing routes ──────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    // Core pages — highest priority
    { url: base,                        lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/search`,            lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/blog`,              lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    // Feature pages
    { url: `${base}/alerts`,            lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/cart`,              lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Business pages
    { url: `${base}/advertise`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/partner`,           lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press`,             lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Legal
    { url: `${base}/privacy`,           lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,             lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  // ── Product SEO pages — buyer intent (generated from PRODUCT_SEO_PAGES) ────
  const productSeoRoutes: MetadataRoute.Sitemap = PRODUCT_SEO_PAGES.map((p) => ({
    url: `${base}/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p.priority,
  }));

  // ── City pages — local SEO (generated from CITY_PAGES) ────────────────────
  const cityRoutes: MetadataRoute.Sitemap = CITY_PAGES.map((c) => ({
    url: `${base}/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: c.priority,
  }));

  // ── Compare pages — high SEO priority (target 90K+ searches/month) ─────────
  const compareRoutes: MetadataRoute.Sitemap = FEATURED_MATCHUPS.map(([a, b], i) => ({
    url: `${base}/compare/${a}-vs-${b}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    // First 5 matchups are highest volume — give them 0.95 priority
    priority: i < 5 ? 0.95 : 0.85,
  }));

  // ── Category routes ────────────────────────────────────────────────────────
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug, i) => ({
    url: `${base}/search?category=${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: i < 4 ? 0.8 : 0.7,
  }));

  // ── Dynamic: products + blog posts (fail-safe — empty on backend error) ────
  const [products, posts] = await Promise.all([
    fetchSitemapProducts(),
    getAllPosts(),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/product/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.isoDate ? new Date(p.isoDate) : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── City × product pages — 40 combinations (8 cities × 5 products) ───────────
  const cityProductRoutes: MetadataRoute.Sitemap = CITY_SLUGS.flatMap((city) =>
    PRODUCT_SLUGS.map((product) => ({
      url: `${base}/price/${city}/${product}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.88,
    }))
  );

  // ── Platform deals pages — high-volume "[platform] offers today" cluster ────
  const dealsRoutes: MetadataRoute.Sitemap = DEAL_PLATFORM_SLUGS.map((platform) => ({
    url: `${base}/deals/${platform}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [
    ...staticRoutes,
    ...productSeoRoutes,    // high buyer-intent pages — near top
    ...cityRoutes,          // local SEO pages
    ...cityProductRoutes,   // city × product intersection — 40 pages
    ...dealsRoutes,         // platform deals — 28K+/mo "offers today" cluster
    ...compareRoutes,       // compare pages — high SEO value
    ...categoryRoutes,
    ...blogRoutes,
    ...productRoutes,
  ];
}
