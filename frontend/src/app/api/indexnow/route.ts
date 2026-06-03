/**
 * IndexNow API endpoint — notifies Google, Bing, and Yandex instantly
 * when new pages are published or updated.
 *
 * Usage: POST /api/indexnow  { "urls": ["https://pricebasket.in/..."] }
 * Or:    GET  /api/indexnow  (submits all high-priority SEO pages)
 *
 * IndexNow key must be set in env: INDEXNOW_KEY
 * The key file must be served at: /[key].txt  (add to /public/)
 */

import { NextRequest, NextResponse } from "next/server";

const SITE_URL = "https://pricebasket.in";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? "";

// All high-priority SEO pages to submit on a full ping
const SEO_PAGES = [
  `${SITE_URL}/`,
  `${SITE_URL}/search`,
  `${SITE_URL}/blog`,
  `${SITE_URL}/best-grocery-deals`,
  `${SITE_URL}/save-money-groceries`,
  // Staple product pages
  `${SITE_URL}/cheapest-atta-online`,
  `${SITE_URL}/cheapest-milk-online`,
  `${SITE_URL}/cheapest-oil-online`,
  `${SITE_URL}/cheapest-rice-online`,
  `${SITE_URL}/cheapest-dal-online`,
  `${SITE_URL}/cheapest-sugar-online`,
  `${SITE_URL}/cheapest-ghee-online`,
  `${SITE_URL}/cheapest-eggs-online`,
  // City pages
  `${SITE_URL}/grocery-prices-mumbai`,
  `${SITE_URL}/grocery-prices-delhi`,
  `${SITE_URL}/grocery-prices-bangalore`,
  `${SITE_URL}/grocery-prices-hyderabad`,
  `${SITE_URL}/grocery-prices-chennai`,
  `${SITE_URL}/grocery-prices-pune`,
  `${SITE_URL}/grocery-prices-kolkata`,
  `${SITE_URL}/grocery-prices-ahmedabad`,
  // Top compare pages
  `${SITE_URL}/compare/blinkit-vs-zepto`,
  `${SITE_URL}/compare/zepto-vs-instamart`,
  `${SITE_URL}/compare/blinkit-vs-instamart`,
  `${SITE_URL}/compare/blinkit-vs-bigbasket`,
  `${SITE_URL}/compare/zepto-vs-bigbasket`,
  `${SITE_URL}/compare/bigbasket-vs-jiomart`,
  // City × product pages — 40 combinations (8 cities × 5 products)
  ...["bangalore", "mumbai", "delhi", "hyderabad", "pune", "chennai", "kolkata", "ahmedabad"].flatMap(
    (city) => ["atta", "milk", "oil", "rice", "dal"].map((product) => `${SITE_URL}/price/${city}/${product}`)
  ),
  // Platform deals pages — "[platform] offers today" cluster
  ...["blinkit", "zepto", "bigbasket", "instamart", "jiomart", "amazon"].map(
    (platform) => `${SITE_URL}/deals/${platform}`
  ),
];

async function submitToIndexNow(urls: string[]): Promise<{ success: boolean; results: Record<string, unknown> }> {
  if (!INDEXNOW_KEY) {
    return { success: false, results: { error: "INDEXNOW_KEY not configured" } };
  }

  const payload = {
    host: "pricebasket.in",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const engines = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
  ];

  const results: Record<string, unknown> = {};

  await Promise.allSettled(
    engines.map(async (engine) => {
      try {
        const res = await fetch(engine, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        });
        results[engine] = { status: res.status, ok: res.ok };
      } catch (err) {
        results[engine] = { error: String(err) };
      }
    })
  );

  return { success: true, results };
}

// GET — submit all SEO pages (call this after deployment)
export async function GET(req: NextRequest) {
  // Require a secret token to prevent abuse
  const token = req.nextUrl.searchParams.get("token");
  const expectedToken = process.env.INDEXNOW_PING_TOKEN ?? "";

  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success, results } = await submitToIndexNow(SEO_PAGES);

  return NextResponse.json({
    submitted: SEO_PAGES.length,
    success,
    results,
    pages: SEO_PAGES,
  });
}

// POST — submit specific URLs
export async function POST(req: NextRequest) {
  // Require a secret token to prevent abuse
  const token = req.nextUrl.searchParams.get("token");
  const expectedToken = process.env.INDEXNOW_PING_TOKEN ?? "";

  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const urls = body.urls ?? SEO_PAGES;

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "urls must be a non-empty array" }, { status: 400 });
  }

  // Validate all URLs belong to our domain
  const invalid = urls.filter((u) => !u.startsWith(SITE_URL));
  if (invalid.length > 0) {
    return NextResponse.json({ error: "All URLs must start with " + SITE_URL, invalid }, { status: 400 });
  }

  const { success, results } = await submitToIndexNow(urls);

  return NextResponse.json({ submitted: urls.length, success, results });
}
