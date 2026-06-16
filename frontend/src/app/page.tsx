import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { MOCK_CATEGORIES, MOCK_PLATFORMS } from "@/lib/mockData";
import { PlatformLogo } from "@/components/PlatformLogo";
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
const CAT_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  "fruits-vegetables": { bg: "#FFF3E0", ring: "#FFCC80", text: "#E65100" },
  "dairy-breakfast":   { bg: "#E3F2FD", ring: "#90CAF9", text: "#1565C0" },
  "snacks-drinks":     { bg: "#F3E5F5", ring: "#CE93D8", text: "#6A1B9A" },
  "bakery":            { bg: "#FBE9E7", ring: "#FFAB91", text: "#BF360C" },
  "household":         { bg: "#E0F2F1", ring: "#80CBC4", text: "#00695C" },
  "personal-care":     { bg: "#FCE4EC", ring: "#F48FB1", text: "#880E4F" },
  "chicken-meat":      { bg: "#FFF8E1", ring: "#FFE082", text: "#F57F17" },
  "frozen-foods":      { bg: "#E8F5E9", ring: "#A5D6A7", text: "#2E7D32" },
  "baby-care":         { bg: "#F8BBD9", ring: "#F48FB1", text: "#880E4F" },
  "pet-care":          { bg: "#EFEBE9", ring: "#BCAAA4", text: "#4E342E" },
  "staples":           { bg: "#FFFDE7", ring: "#FFF176", text: "#F57F17" },
  "oils-spices":       { bg: "#FFF3E0", ring: "#FFCC80", text: "#BF360C" },
};

// ── Comparison pairs for SEO internal links ──────────────────────────────────
const COMPARE_PAIRS = [
  { a: "blinkit", b: "zepto",     label: "Blinkit vs Zepto" },
  { a: "zepto",   b: "instamart", label: "Zepto vs Instamart" },
  { a: "blinkit", b: "bigbasket", label: "Blinkit vs BigBasket" },
  { a: "zepto",   b: "bigbasket", label: "Zepto vs BigBasket" },
  { a: "blinkit", b: "instamart", label: "Blinkit vs Instamart" },
  { a: "bigbasket", b: "jiomart", label: "BigBasket vs JioMart" },
];

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

      {/* ── Hero carousel ── */}
      <HeroCarousel />

      <div className="max-w-screen-xl mx-auto px-4">

        {/* ── Platform logos strip ── */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {MOCK_PLATFORMS.map((p) => (
            <div key={p.slug}
              className="flex items-center gap-2 flex-shrink-0 bg-white rounded-xl
                         px-3 py-2 border border-surface-100 shadow-sm
                         hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="h-8 min-w-[2rem] max-w-[5rem] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center px-1"
                style={{ backgroundColor: (p.color_hex ?? "#e5e7eb") + "18", border: `1.5px solid ${p.color_hex ?? "#e5e7eb"}35` }}>
                <PlatformLogo slug={p.slug} name={p.name} colorHex={p.color_hex} size={22} />
              </div>
              <span className="text-[12px] font-semibold text-surface-700 whitespace-nowrap">{p.name}</span>
            </div>
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
                      sizes="64px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
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

        {/* ── WhatsApp Community Join Banner ── */}
        <div className="my-6 rounded-3xl overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
          <div className="px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
                💬
              </div>
              <div>
                <p className="text-white font-extrabold text-base leading-tight">
                  Get Daily Deals on WhatsApp — Free!
                </p>
                <p className="text-green-100 text-sm mt-0.5">
                  Join 10,000+ smart shoppers saving ₹500/month on groceries
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/918005828390?text=Hi%2C%20I%20want%20to%20join%20PriceBasket%20daily%20deals!"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-white text-green-700 font-extrabold text-sm
                         px-6 py-3 rounded-2xl hover:bg-green-50 transition-colors
                         shadow-md active:scale-95 whitespace-nowrap"
            >
              Join WhatsApp →
            </a>
          </div>
        </div>

        {/* ── Price Comparison Quick Links (SEO + UX) ── */}
        <div className="mb-6">
          <h2 className="text-sm font-extrabold text-surface-800 mb-3 flex items-center gap-2">
            <span className="text-base">⚡</span>
            Popular Price Comparisons
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMPARE_PAIRS.map((pair) => (
              <Link
                key={`${pair.a}-${pair.b}`}
                href={`/compare/${pair.a}-vs-${pair.b}`}
                className="flex items-center justify-between bg-white rounded-2xl
                           border border-surface-100 px-4 py-3
                           hover:border-brand-300 hover:shadow-md
                           transition-all duration-150 group"
              >
                <span className="text-sm font-semibold text-surface-700 group-hover:text-brand-600">
                  {pair.label}
                </span>
                <span className="text-brand-500 text-xs font-bold">Compare →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── SEO keyword-rich trust section ── */}
        <section className="bg-white rounded-3xl border border-surface-100 p-6 mb-6">
          <h1 className="text-lg font-extrabold text-surface-900 mb-2">
            India&apos;s Smartest Grocery Price Comparison — Blinkit vs Zepto vs BigBasket
          </h1>
          <p className="text-sm text-surface-600 leading-relaxed mb-4">
            PriceBasket compares real-time grocery prices across <strong>Blinkit, Zepto,
            Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Minutes, JioMart</strong> and
            DMart Ready — 10 platforms in one place. The same 500ml Dettol can costs ₹89 on
            Blinkit and ₹72 on JioMart. PriceBasket finds that in 2 seconds, for free. Stop
            overpaying for fruits, vegetables, dairy, snacks and household essentials — compare
            Blinkit vs Zepto prices or BigBasket vs Swiggy Instamart in one tap.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { emoji: "🔍", title: "Real-Time Prices",  desc: "Live data from 10 apps" },
              { emoji: "🔔", title: "Price Alerts",      desc: "Get notified on drops" },
              { emoji: "🛒", title: "Cart Optimizer",    desc: "Max savings per order" },
              { emoji: "💰", title: "Save ₹500/month",   desc: "Average user saving" },
            ].map((f) => (
              <div key={f.title} className="text-center p-3 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="text-2xl mb-1">{f.emoji}</div>
                <p className="text-xs font-extrabold text-surface-800">{f.title}</p>
                <p className="text-[10px] text-surface-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-base font-extrabold text-surface-900 mb-2">How PriceBasket Works</h2>
          <ol className="text-sm text-surface-600 leading-relaxed space-y-1.5 list-decimal list-inside mb-4">
            <li><strong>Search</strong> any grocery product — atta, milk, eggs, vegetables, or any brand.</li>
            <li><strong>Compare</strong> live prices from Blinkit, Zepto, BigBasket, Instamart, JioMart & more side by side.</li>
            <li><strong>Buy</strong> from the cheapest platform — save ₹340 on average per order, ₹500–₹2,000 per month.</li>
          </ol>

          <h2 className="text-base font-extrabold text-surface-900 mb-2">Why Use PriceBasket?</h2>
          <p className="text-sm text-surface-600 leading-relaxed mb-3">
            Quick-commerce apps like Blinkit, Zepto and Swiggy Instamart charge different prices
            for the same product — sometimes a 20–40% difference. PriceBasket tracks prices for
            thousands of products across all major platforms and shows you who is cheapest right now.
            Set price alerts for your favourite products, optimise your cart to split orders across
            platforms, and never pay more than you have to for fresh fruits, vegetables, dairy,
            packaged staples or household items. 100% free, no app download needed.
          </p>

          <h2 className="text-base font-extrabold text-surface-900 mb-2">What Can You Compare?</h2>
          <p className="text-sm text-surface-600 leading-relaxed mb-3">
            Compare prices on everything — <strong>fresh fruits and vegetables</strong>, milk, eggs,
            bread, atta, rice, cooking oil, pulses, packaged snacks, soft drinks, household
            cleaners, personal care products, baby food and pet supplies. Search by product name
            or brand (e.g. Amul, Aashirvaad, Tata, Parle, Maggi) and instantly see which
            platform has the lowest price today.
          </p>

          <h2 className="text-base font-extrabold text-surface-900 mb-2">Which Cities Are Covered?</h2>
          <p className="text-sm text-surface-600 leading-relaxed">
            PriceBasket is available across all major Indian cities — <strong>Mumbai, Delhi,
            Bangalore, Hyderabad, Chennai, Pune, Kolkata</strong> and Ahmedabad — wherever
            Blinkit, Zepto, Swiggy Instamart, BigBasket or JioMart deliver. Prices shown are
            based on your selected delivery location, so you always see the most accurate
            comparison for your area.
          </p>
        </section>


      </div>
    </div>
  );
}

