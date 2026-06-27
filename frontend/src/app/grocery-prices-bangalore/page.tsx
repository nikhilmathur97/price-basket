import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grocery Prices in Bangalore 2026 — Blinkit vs Zepto",
  description:
    "Compare grocery prices in Bangalore across Blinkit, Zepto, Instamart, BigBasket & JioMart. Find cheapest grocery delivery in Bangalore. Save ₹500/month. Free.",
  keywords: [
    "grocery prices bangalore",
    "cheapest grocery delivery bangalore",
    "blinkit bangalore prices",
    "zepto bangalore prices",
    "bigbasket bangalore",
    "swiggy instamart bangalore",
    "online grocery bangalore",
    "grocery comparison bangalore",
    "cheap groceries bangalore",
    "grocery delivery bangalore 2026",
  ],
  alternates: { canonical: "https://pricebasket.in/grocery-prices-bangalore" },
  openGraph: {
    title: "Grocery Prices in Bangalore 2026 — Blinkit vs Zepto vs BigBasket",
    description: "Compare grocery prices across all apps in Bangalore. Find cheapest delivery. Free.",
    url: "https://pricebasket.in/grocery-prices-bangalore",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which grocery app is cheapest in Bangalore?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No single app is always cheapest in Bangalore. Zepto and Blinkit compete aggressively in Bangalore's tech corridors. BigBasket (headquartered in Bangalore) has excellent coverage and competitive staple prices. PriceBasket compares all 8 apps in real-time.",
      },
    },
    {
      "@type": "Question",
      name: "Does Zepto deliver in Whitefield and Electronic City?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Zepto covers most of Bangalore including Whitefield, Electronic City, Koramangala, Indiranagar, HSR Layout, and more. Blinkit and Swiggy Instamart also have strong Bangalore coverage.",
      },
    },
    {
      "@type": "Question",
      name: "Is BigBasket cheaper in Bangalore since it's headquartered there?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BigBasket has excellent coverage and competitive prices in Bangalore, especially on staples and their BB Royal private label. However, Zepto and Blinkit often beat BigBasket on quick-commerce items. Use PriceBasket to compare all platforms for your specific cart.",
      },
    },
  ],
};

const BANGALORE_AREAS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield",
  "Electronic City", "Marathahalli", "Jayanagar", "JP Nagar",
  "Bannerghatta Road", "Sarjapur Road", "Hebbal", "Yelahanka",
  "Rajajinagar", "Malleshwaram", "BTM Layout",
];

const COMPARE_PAIRS = [
  { label: "Blinkit vs Zepto in Bangalore",     href: "/compare/blinkit-vs-zepto" },
  { label: "Zepto vs Instamart in Bangalore",   href: "/compare/zepto-vs-instamart" },
  { label: "Blinkit vs BigBasket in Bangalore", href: "/compare/blinkit-vs-bigbasket" },
  { label: "BigBasket vs JioMart in Bangalore", href: "/compare/bigbasket-vs-jiomart" },
];

const OTHER_CITIES = [
  { label: "Mumbai",    href: "/grocery-prices-mumbai" },
  { label: "Delhi",     href: "/grocery-prices-delhi" },
  { label: "Hyderabad", href: "/grocery-prices-hyderabad" },
  { label: "Chennai",   href: "/grocery-prices-chennai" },
  { label: "Pune",      href: "/grocery-prices-pune" },
];

const PLATFORMS = [
  {
    name: "Blinkit",
    color: "#f8cb46",
    emoji: "⚡",
    verdict: "Strong network across Bangalore's tech corridors — Koramangala, Indiranagar, Whitefield. Best for branded FMCG and 10-minute delivery.",
    best: "Tech corridors, branded products",
  },
  {
    name: "Zepto",
    color: "#7c3aed",
    emoji: "🟣",
    verdict: "Very competitive in Bangalore. Often cheapest on fresh produce and dairy. Popular with Bangalore's young tech workforce. Strong in HSR Layout and BTM.",
    best: "Fresh produce, HSR/BTM Layout",
  },
  {
    name: "Swiggy Instamart",
    color: "#f97316",
    emoji: "🟠",
    verdict: "Swiggy is strong in Bangalore (its home city). Good for Swiggy One subscribers. Frequent coupons. Excellent coverage across all areas.",
    best: "Swiggy One users, all areas",
  },
  {
    name: "BigBasket",
    color: "#84c225",
    emoji: "🟢",
    verdict: "Headquartered in Bangalore — excellent coverage and competitive prices. Best on staples and BB Royal private label. Strong scheduled delivery network.",
    best: "Staples, weekly shopping, BB Royal",
  },
  {
    name: "JioMart",
    color: "#0a73ba",
    emoji: "🔵",
    verdict: "Competitive on staples and bulk packs in Bangalore. Good for value shoppers. Expanding coverage in outer Bangalore areas.",
    best: "Staples, bulk packs, value",
  },
];

export default function GroceryPricesBangalorePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-3">
            📍 Bangalore — Grocery Price Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Grocery Prices in Bangalore 2026
          </h1>
          <p className="text-purple-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart prices in Bangalore.
            Find the cheapest grocery delivery in your area. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-purple-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-purple-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Bangalore Grocery Prices
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
              { value: "15+",  label: "Bangalore Areas" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-purple-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Bangalore areas ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">
            Grocery Delivery Areas in Bangalore
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            All major quick-commerce platforms operate across Bangalore. PriceBasket compares
            prices so you always pay the least in your neighbourhood.
          </p>
          <div className="flex flex-wrap gap-2">
            {BANGALORE_AREAS.map((area) => (
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
            Which App is Cheapest in Bangalore?
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
            Compare Grocery Apps in Bangalore
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
            Bangalore Grocery FAQs
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Which grocery app is cheapest in Bangalore in 2026?",
                a: "No single app is always cheapest in Bangalore. Zepto and Blinkit compete aggressively in tech corridors. BigBasket (headquartered in Bangalore) has excellent staple prices. PriceBasket compares all 8 apps in real-time so Bangalore shoppers always find the cheapest option.",
              },
              {
                q: "Does Blinkit deliver in Whitefield and Electronic City?",
                a: "Yes, Blinkit covers most of Bangalore including Whitefield, Electronic City, Koramangala, Indiranagar and more. Zepto and Swiggy Instamart also have strong Bangalore coverage.",
              },
              {
                q: "Is BigBasket cheaper in Bangalore since it's based there?",
                a: "BigBasket has excellent coverage and competitive prices in Bangalore, especially on staples and BB Royal private label. However, Zepto and Blinkit often beat BigBasket on quick-commerce items. Use PriceBasket to compare all platforms.",
              },
              {
                q: "How do I get the cheapest grocery delivery in Bangalore?",
                a: "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart and more. It's free, works without downloading any app, and saves Bangalore shoppers ₹340 per order on average.",
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
            Find Cheapest Groceries in Bangalore Now
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
