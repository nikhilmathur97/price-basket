/**
 * Static metadata for the quick-commerce platforms PriceBasket tracks.
 * Used by the programmatic /compare/[matchup] SEO landing pages.
 */

export interface PlatformInfo {
  slug: string;
  name: string;
  color: string;
  /** typical delivery promise, human-readable */
  delivery: string;
  /** one-line positioning used in comparison copy */
  blurb: string;
  strengths: string[];
}

export const PLATFORMS: Record<string, PlatformInfo> = {
  blinkit: {
    slug: "blinkit",
    name: "Blinkit",
    color: "#f8cb46",
    delivery: "10–15 min",
    blurb: "Zomato-owned 10-minute delivery with the widest dark-store network.",
    strengths: ["Largest catalog", "Dense store network", "Reliable 10-min delivery"],
  },
  zepto: {
    slug: "zepto",
    name: "Zepto",
    color: "#7c3aed",
    delivery: "10 min",
    blurb: "Fast-growing 10-minute app known for aggressive pricing and private labels.",
    strengths: ["Aggressive discounts", "Strong private labels", "Clean app experience"],
  },
  instamart: {
    slug: "instamart",
    name: "Swiggy Instamart",
    color: "#f97316",
    delivery: "10–20 min",
    blurb: "Swiggy's grocery arm, tightly integrated with the Swiggy super-app.",
    strengths: ["Swiggy One perks", "Good fresh range", "Frequent coupons"],
  },
  bigbasket: {
    slug: "bigbasket",
    name: "BigBasket",
    color: "#84c225",
    delivery: "Scheduled / express",
    blurb: "India's largest online supermarket for planned weekly shops.",
    strengths: ["Best on staples", "Huge catalog", "Strong private labels"],
  },
  jiomart: {
    slug: "jiomart",
    name: "JioMart",
    color: "#0a73ba",
    delivery: "Same/next day",
    blurb: "Reliance's value-focused grocery platform with deep staple discounts.",
    strengths: ["Low staple prices", "Bulk packs", "Wide reach beyond metros"],
  },
  amazon: {
    slug: "amazon",
    name: "Amazon",
    color: "#ff9900",
    delivery: "Express / next day",
    blurb: "Amazon Fresh & Now with Prime perks and frequent coupon stacking.",
    strengths: ["Prime benefits", "Coupon stacking", "Trusted fulfilment"],
  },
  flipkart: {
    slug: "flipkart",
    name: "Flipkart Minutes",
    color: "#2874f0",
    delivery: "10–15 min",
    blurb: "Flipkart's quick-commerce entry expanding fast across metros.",
    strengths: ["Flipkart ecosystem", "Launch offers", "Growing catalog"],
  },
  dmart: {
    slug: "dmart",
    name: "DMart Ready",
    color: "#008752",
    delivery: "Scheduled pickup/delivery",
    blurb: "DMart's online arm carrying its famous everyday-low-price staples.",
    strengths: ["Lowest staple prices", "Bulk value", "Trusted brand"],
  },
};

export function getPlatform(slug: string): PlatformInfo | undefined {
  return PLATFORMS[slug];
}

/** Common, high-search-volume matchups pre-rendered at build time.
 *  Each pair = one SEO landing page at /compare/[a]-vs-[b]
 *  Targeting: "blinkit vs zepto" = 90K searches/month, etc.
 */
export const FEATURED_MATCHUPS: [string, string][] = [
  // Tier 1 — highest search volume (90K–40K/month)
  ["blinkit",   "zepto"],
  ["zepto",     "instamart"],
  ["blinkit",   "instamart"],
  ["blinkit",   "bigbasket"],
  ["zepto",     "bigbasket"],

  // Tier 2 — strong volume (25K–15K/month)
  ["bigbasket", "jiomart"],
  ["bigbasket", "amazon"],
  ["jiomart",   "dmart"],
  ["instamart", "bigbasket"],
  ["amazon",    "flipkart"],

  // Tier 3 — growing searches (10K–5K/month)
  ["blinkit",   "jiomart"],
  ["zepto",     "jiomart"],
  ["blinkit",   "amazon"],
  ["zepto",     "amazon"],
  ["blinkit",   "flipkart"],
  ["zepto",     "flipkart"],
  ["instamart", "jiomart"],
  ["amazon",    "bigbasket"],
  ["flipkart",  "bigbasket"],
  ["dmart",     "bigbasket"],
];

/** Parse an "a-vs-b" matchup slug into its two platform slugs (or null). */
export function parseMatchup(
  matchup: string,
): { a: PlatformInfo; b: PlatformInfo } | null {
  const parts = matchup.toLowerCase().split("-vs-");
  if (parts.length !== 2) return null;
  const a = getPlatform(parts[0]);
  const b = getPlatform(parts[1]);
  if (!a || !b || a.slug === b.slug) return null;
  return { a, b };
}
