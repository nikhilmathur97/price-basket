import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { MOCK_CATEGORIES } from "@/lib/mockData";
import { HomeProductSections } from "@/components/HomeProductSections";

// Code-split HeroCarousel — Framer Motion is heavy; deferring its JS chunk
// reduces initial parse time and improves mobile LCP.
const HeroCarousel = dynamic(
  () => import("@/components/HeroCarousel").then((m) => m.HeroCarousel),
  {
    loading: () => (
      <div className="h-48 md:h-56 bg-[#FC5A01] rounded-b-2xl animate-pulse" />
    ),
  }
);

// ── Below-fold sections — code-split so their JS is never in the initial bundle
// These components are only parsed/executed when the browser is idle after the
// above-the-fold content has painted, directly reducing TBT and Speed Index.
const BelowFoldSections = dynamic(
  () => import("@/components/BelowFoldSections").then((m) => m.BelowFoldSections),
  { ssr: false, loading: () => null }
);

export const metadata: Metadata = {
  title: "PriceBasket — Compare Blinkit, Zepto & BigBasket Prices",
  description:
    "Compare Blinkit vs Zepto, BigBasket, Swiggy Instamart & JioMart grocery prices in real-time. Find the cheapest quick-commerce app & save ₹500/month. Free.",
  keywords: [
    "compare blinkit zepto prices",
    "blinkit vs zepto price comparison",
    "pricebasket compare grocery india",
    "blinkit zepto bigbasket price compare",
    "swiggy instamart vs blinkit",
    "zepto swiggy price compare",
    "instamart bigbasket compare",
    "cheapest grocery app india",
    "grocery price comparison india",
    "quick commerce price comparison",
    "online grocery deals india",
    "save money groceries india",
    "grocery price tracker india",
    "blinkit price check",
    "zepto price check",
    "flipkart minutes price compare",
    "fruits veggies cheapest price india",
    "pricebasket india",
  ],
  alternates: { canonical: "https://pricebasket.in" },
  openGraph: {
    title: "PriceBasket — Compare Blinkit vs Zepto vs BigBasket Prices",
    description: "Compare Blinkit, Zepto, BigBasket & Instamart grocery prices in real-time. Save ₹500/month. Free forever.",
    url: "https://pricebasket.in",
    siteName: "PriceBasket",
    type: "website",
    locale: "en_IN",
  },
};

// ── FAQ structured data for Google rich results ──────────────────────────────
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Which grocery app is cheapest in India — Blinkit or Zepto?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Prices vary by product. PriceBasket compares Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart and more in real-time so you always find the cheapest option. On average, users save ₹340 per order.",
      },
    },
    {
      "@type": "Question",
      "name": "Is PriceBasket free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, PriceBasket is 100% free. Compare prices, set price alerts, and use the cart optimizer at no cost.",
      },
    },
    {
      "@type": "Question",
      "name": "How does PriceBasket compare grocery prices?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PriceBasket fetches real-time prices from Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Minutes, JioMart and DMart. Search any product and instantly see prices across all platforms side by side.",
      },
    },
    {
      "@type": "Question",
      "name": "Which platforms does PriceBasket compare?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PriceBasket compares prices across Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Minutes, JioMart, and DMart Ready — 8 platforms in one place.",
      },
    },
    {
      "@type": "Question",
      "name": "How much can I save using PriceBasket?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Users save an average of ₹340 per order and ₹500–₹2,000 per month by buying from the cheapest platform for each product.",
      },
    },
  ],
};

// ── Website structured data ───────────────────────────────────────────────────
const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PriceBasket",
  "url": "https://pricebasket.in",
  "description": "India's grocery price comparison platform. Compare Blinkit, Zepto, BigBasket, Instamart prices in real-time.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://pricebasket.in/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

// ── Category card colour accents ────────────────────────────────────────────
// All text values verified to pass WCAG AA (≥4.5:1) against white background.
// Replaced light shades (e.g. #F57F17 = 2.9:1, #84C225 = 2.4:1) with darker
// equivalents from the same hue family.
const CAT_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  "fruits-vegetables": { bg: "#FFF3E0", ring: "#FFCC80", text: "#C84B00" }, // 4.6:1 on white
  "dairy-breakfast":   { bg: "#E3F2FD", ring: "#90CAF9", text: "#1565C0" }, // 7.0:1
  "snacks-drinks":     { bg: "#F3E5F5", ring: "#CE93D8", text: "#6A1B9A" }, // 7.5:1
  "bakery":            { bg: "#FBE9E7", ring: "#FFAB91", text: "#BF360C" }, // 5.2:1
  "household":         { bg: "#E0F2F1", ring: "#80CBC4", text: "#00695C" }, // 4.6:1
  "personal-care":     { bg: "#FCE4EC", ring: "#F48FB1", text: "#880E4F" }, // 6.5:1
  "chicken-meat":      { bg: "#FFF8E1", ring: "#FFE082", text: "#B45309" }, // 4.7:1 (replaces #F57F17 = 2.9:1)
  "frozen-foods":      { bg: "#E8F5E9", ring: "#A5D6A7", text: "#2E7D32" }, // 5.1:1
  "baby-care":         { bg: "#F8BBD9", ring: "#F48FB1", text: "#880E4F" }, // 6.5:1
  "pet-care":          { bg: "#EFEBE9", ring: "#BCAAA4", text: "#4E342E" }, // 7.2:1
  "staples":           { bg: "#FFFDE7", ring: "#FFF176", text: "#B45309" }, // 4.7:1 (replaces #F57F17 = 2.9:1)
  "oils-spices":       { bg: "#FFF3E0", ring: "#FFCC80", text: "#BF360C" }, // 5.2:1
};

// ── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20 md:pb-8">

      {/* ── JSON-LD structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
      />

      {/* ── H1 — always present in server-rendered HTML for SEO crawlers.
          Visually hidden so it doesn't duplicate the carousel headline,
          but fully accessible to screen readers and search engines. ── */}
      <h1 className="sr-only">
        Compare Grocery Prices — Blinkit, Zepto, BigBasket &amp; More
      </h1>

      {/* ── Hero carousel ── */}
      <HeroCarousel />

      <div className="max-w-screen-xl mx-auto px-4">

        {/* ── Platform logos strip — static HTML, zero JS, renders instantly ──
            Hardcoded so this strip paints on first render without waiting for
            any client bundle. PlatformLogo SVGs are inlined via the component
            in BelowFoldSections for the interactive platform cards below. */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {[
            { slug: "blinkit",   name: "Blinkit",   eta: "10 min", href: "/deals/blinkit"   },
            { slug: "zepto",     name: "Zepto",     eta: "8 min",  href: "/deals/zepto"     },
            { slug: "instamart", name: "Instamart", eta: "15 min", href: "/deals/instamart" },
            { slug: "bigbasket", name: "BigBasket", eta: "30 min", href: "/deals/bigbasket" },
            { slug: "flipkart",  name: "Flipkart",  eta: "10 min", href: "/deals/flipkart"  },
            { slug: "amazon",    name: "Amazon",    eta: "2 hrs",  href: "/deals/amazon"    },
            { slug: "jiomart",   name: "JioMart",   eta: "30 min", href: "/deals/jiomart"   },
          ].map((p) => (
            <Link
              key={p.slug}
              href={p.href}
              aria-label={`${p.name} deals`}
              className="flex items-center gap-2 flex-shrink-0 bg-white rounded-xl
                         px-3 py-2 border border-surface-100 shadow-sm
                         hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <div className="h-8 w-8 rounded-lg bg-surface-50 border border-surface-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-surface-600">
                {p.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold text-surface-700 whitespace-nowrap leading-tight">{p.name}</span>
                <span className="text-[10px] font-bold whitespace-nowrap leading-tight text-surface-600">⚡ {p.eta}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Category grid ── */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
          {MOCK_CATEGORIES.map((cat) => {
            const colors = CAT_COLORS[cat.slug] ?? { bg: "#f5f5f5", ring: "#e0e0e0", text: "#525252" };
            return (
              <Link key={cat.slug} href={`/search?category=${cat.slug}`}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl group
                           hover:bg-white hover:shadow-md active:scale-[0.93]
                           transition-all duration-200 cursor-pointer">
                {/* Image or emoji tile */}
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden
                             flex items-center justify-center relative
                             group-hover:scale-110 group-hover:shadow-lg
                             transition-all duration-200"
                  style={{
                    backgroundColor: colors.bg,
                    boxShadow: `0 0 0 2px ${colors.ring}`,
                  }}
                >
                  {cat.image_url ? (
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        fill
                        // Category tiles display at 56–64px. Removing unoptimized lets
                        // Next.js serve a 64px WebP/AVIF instead of the raw JPEG.
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                  ) : (
                    <span className="text-2xl sm:text-3xl select-none">{cat.icon}</span>
                  )}
                </div>
                <span
                  className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight
                             line-clamp-2 transition-colors duration-200"
                  style={{ color: colors.text }}
                >
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Product sections (fetches from API, falls back to mock) ── */}
        <HomeProductSections />

        {/* ── Below-fold sections — lazy-loaded client bundle ──
            Platform cards, WhatsApp banner, compare pairs, city links and the
            SEO trust section are all deferred into a separate async JS chunk.
            This keeps the initial JS payload small and reduces TBT. */}
        <BelowFoldSections />

      </div>
    </div>
  );
}
