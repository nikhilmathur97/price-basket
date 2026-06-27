import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grocery Prices in Delhi 2026 — Compare Blinkit, Zepto, BigBasket | PriceBasket",
  description:
    "Compare grocery prices in Delhi NCR across Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart. Find cheapest grocery delivery in Delhi. Save ₹500/month. Free price alerts.",
  keywords: [
    "grocery prices delhi",
    "cheapest grocery delivery delhi",
    "blinkit delhi prices",
    "zepto delhi prices",
    "bigbasket delhi",
    "swiggy instamart delhi",
    "online grocery delhi ncr",
    "grocery comparison delhi",
    "cheap groceries delhi",
    "grocery delivery delhi 2026",
    "grocery prices gurgaon",
    "grocery prices noida",
  ],
  alternates: { canonical: "https://pricebasket.in/grocery-prices-delhi" },
  openGraph: {
    title: "Grocery Prices in Delhi NCR 2026 — Blinkit vs Zepto vs BigBasket",
    description: "Compare grocery prices across all apps in Delhi NCR. Find cheapest delivery. Free.",
    url: "https://pricebasket.in/grocery-prices-delhi",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which grocery app is cheapest in Delhi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No single app is always cheapest in Delhi NCR. Blinkit has the strongest network in Delhi, while Zepto and Instamart compete aggressively on price. PriceBasket compares all 8 apps in real-time so Delhi shoppers always find the cheapest price.",
      },
    },
    {
      "@type": "Question",
      name: "Does Blinkit deliver in Gurgaon and Noida?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Blinkit has strong coverage across Delhi NCR including Gurgaon, Noida, Faridabad, and Ghaziabad. Zepto and Swiggy Instamart also cover most of NCR. Use PriceBasket to compare prices across all platforms in your area.",
      },
    },
    {
      "@type": "Question",
      name: "How much can I save on groceries in Delhi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Delhi shoppers using PriceBasket save an average of ₹340 per order and ₹500–₹2,000 per month. The same product can cost 15–40% more on one platform vs another in Delhi NCR.",
      },
    },
  ],
};

const DELHI_AREAS = [
  "South Delhi", "North Delhi", "West Delhi", "East Delhi",
  "Gurgaon", "Noida", "Faridabad", "Ghaziabad",
  "Dwarka", "Rohini", "Pitampura", "Lajpat Nagar",
  "Connaught Place", "Saket", "Vasant Kunj",
];

const COMPARE_PAIRS = [
  { label: "Blinkit vs Zepto in Delhi",     href: "/compare/blinkit-vs-zepto" },
  { label: "Zepto vs Instamart in Delhi",   href: "/compare/zepto-vs-instamart" },
  { label: "Blinkit vs BigBasket in Delhi", href: "/compare/blinkit-vs-bigbasket" },
  { label: "BigBasket vs JioMart in Delhi", href: "/compare/bigbasket-vs-jiomart" },
];

const OTHER_CITIES = [
  { label: "Mumbai",    href: "/grocery-prices-mumbai" },
  { label: "Bangalore", href: "/grocery-prices-bangalore" },
  { label: "Hyderabad", href: "/grocery-prices-hyderabad" },
  { label: "Chennai",   href: "/grocery-prices-chennai" },
  { label: "Pune",      href: "/grocery-prices-pune" },
];

const PLATFORMS = [
  {
    name: "Blinkit",
    color: "#f8cb46",
    emoji: "⚡",
    verdict: "Strongest network in Delhi NCR with dark stores across all major areas. Best for branded FMCG and household items. Reliable 10-minute delivery.",
    best: "Branded products, fastest delivery",
  },
  {
    name: "Zepto",
    color: "#7c3aed",
    emoji: "🟣",
    verdict: "Aggressively priced in Delhi NCR. Often cheapest on fresh produce and dairy. Strong in Gurgaon and Noida. Private labels 20–30% cheaper than brands.",
    best: "Fresh produce, Gurgaon/Noida",
  },
  {
    name: "Swiggy Instamart",
    color: "#f97316",
    emoji: "🟠",
    verdict: "Good for Swiggy One subscribers in Delhi. Frequent coupons. Strong coverage in South Delhi and Gurgaon. Integrated with Swiggy food orders.",
    best: "Swiggy One users, South Delhi",
  },
  {
    name: "BigBasket",
    color: "#84c225",
    emoji: "🟢",
    verdict: "Best for planned weekly shops in Delhi. Cheapest on staples. BB Royal private label is excellent value. Scheduled delivery slots available.",
    best: "Staples, weekly shopping",
  },
  {
    name: "JioMart",
    color: "#0a73ba",
    emoji: "🔵",
    verdict: "Competitive on staples and bulk packs in Delhi NCR. Good for Reliance Smart shoppers. Strong in West Delhi and outer areas.",
    best: "Staples, bulk packs, West Delhi",
  },
];

export default function GroceryPricesDelhiPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-3">
            📍 Delhi NCR — Grocery Price Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Grocery Prices in Delhi NCR 2026
          </h1>
          <p className="text-red-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart prices in Delhi, Gurgaon, Noida.
            Find the cheapest grocery delivery in your area. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-red-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-red-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Delhi Grocery Prices
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "₹340", label: "Avg Saving/Order" },
              { value: "15+",  label: "Delhi NCR Areas" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-red-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Delhi areas ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">
            Grocery Delivery Areas in Delhi NCR
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            Blinkit, Zepto, Swiggy Instamart and BigBasket deliver across all major Delhi NCR areas
            including Gurgaon, Noida, Faridabad and Ghaziabad.
          </p>
          <div className="flex flex-wrap gap-2">
            {DELHI_AREAS.map((area) => (
              <span key={area}
                className="text-sm font-semibold bg-white border border-surface-200
                           text-surface-700 px-3 py-1.5 rounded-full">
                📍 {area}
              </span>
            ))}
          </div>
        </section>

        {/* ── Platform comparison ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Which App is Cheapest in Delhi NCR?
          </h2>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl border border-surface-100 p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center
                                text-lg font-black flex-shrink-0"
                    style={{ backgroundColor: p.color + "22", border: `2px solid ${p.color}44` }}
                  >
                    {p.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-extrabold text-surface-900">{p.name}</p>
                      <span className="text-[11px] font-bold text-green-600 bg-green-50
                                       border border-green-100 px-2 py-0.5 rounded-full">
                        Best for: {p.best}
                      </span>
                    </div>
                    <p className="text-sm text-surface-600 leading-relaxed">{p.verdict}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Compare links ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Compare Grocery Apps in Delhi
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {COMPARE_PAIRS.map((p) => (
              <Link key={p.href} href={p.href}
                className="bg-white rounded-2xl border border-surface-100 p-4
                           hover:border-brand-300 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-surface-900 text-sm group-hover:text-brand-600">
                    {p.label}
                  </p>
                  <span className="text-brand-500 text-xs font-bold">Compare →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Delhi Grocery FAQs
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Which grocery app is cheapest in Delhi in 2026?",
                a: "No single app is always cheapest in Delhi NCR. Blinkit has the widest network, Zepto is often cheapest on fresh produce, and BigBasket wins on staples. PriceBasket compares all 8 apps in real-time so Delhi shoppers always find the cheapest option.",
              },
              {
                q: "Does Zepto deliver in Gurgaon and Noida?",
                a: "Yes, Zepto has strong coverage in Gurgaon and Noida. Blinkit and Swiggy Instamart also cover most of NCR. Use PriceBasket to compare prices across all platforms in your specific area.",
              },
              {
                q: "Is Blinkit cheaper than Zepto in Delhi?",
                a: "It depends on the product. Blinkit is often cheaper on branded FMCG while Zepto wins on fresh produce and private labels. Use PriceBasket to compare both for your specific cart in Delhi.",
              },
              {
                q: "How do I get the cheapest grocery delivery in Delhi?",
                a: "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart and more. It's free, works without downloading any app, and saves Delhi shoppers ₹340 per order on average.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-2">{faq.q}</h3>
                <p className="text-[13px] text-surface-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Other cities ── */}
        <section className="mb-8">
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            Grocery Prices in Other Cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {OTHER_CITIES.map((c) => (
              <Link key={c.href} href={c.href}
                className="text-sm font-semibold bg-white border border-surface-200
                           text-brand-600 hover:border-brand-300 px-4 py-2 rounded-xl
                           transition-colors">
                📍 {c.label} →
              </Link>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">
            Find Cheapest Groceries in Delhi Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Free forever. No app download. Compare 8 platforms in 2 seconds.
          </p>
          <Link
            href="/search"
            className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                       hover:bg-orange-50 transition-colors text-sm inline-block"
          >
            🔍 Compare Prices Now
          </Link>
        </div>

      </div>
    </div>
  );
}
