import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grocery Prices in Pune 2026 — Blinkit vs Zepto",
  description:
    "Compare grocery prices in Pune across Blinkit, Zepto, Instamart, BigBasket & JioMart. Find cheapest grocery delivery in Pune. Save ₹500/month. Free.",
  keywords: [
    "grocery prices pune",
    "cheapest grocery delivery pune",
    "blinkit pune prices",
    "zepto pune prices",
    "bigbasket pune",
    "swiggy instamart pune",
    "online grocery pune",
    "grocery comparison pune",
    "cheap groceries pune",
    "grocery delivery pune 2026",
  ],
  alternates: { canonical: "https://pricebasket.in/grocery-prices-pune" },
  openGraph: {
    title: "Grocery Prices in Pune 2026 — Blinkit vs Zepto vs BigBasket",
    description: "Compare grocery prices across all apps in Pune. Find cheapest delivery. Free.",
    url: "https://pricebasket.in/grocery-prices-pune",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which grocery app is cheapest in Pune?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No single app is always cheapest in Pune. Blinkit, Zepto and Swiggy Instamart all compete in Pune's tech areas like Hinjewadi and Kothrud. PriceBasket compares all 8 apps in real-time so Pune shoppers always find the cheapest price.",
      },
    },
    {
      "@type": "Question",
      name: "Does Blinkit deliver in Hinjewadi and Kothrud?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Blinkit covers major Pune areas including Hinjewadi, Kothrud, Baner, Aundh, Viman Nagar, Koregaon Park and more. Zepto and Swiggy Instamart also have strong Pune coverage.",
      },
    },
  ],
};

const PUNE_AREAS = [
  "Hinjewadi", "Kothrud", "Baner", "Aundh",
  "Viman Nagar", "Koregaon Park", "Kalyani Nagar", "Wakad",
  "Pimpri", "Chinchwad", "Hadapsar", "Magarpatta",
  "Shivajinagar", "Deccan", "Kharadi",
];

const PLATFORMS = [
  {
    name: "Blinkit",
    color: "#f8cb46",
    emoji: "⚡",
    verdict: "Strong in Pune's tech areas. Best for branded FMCG and 10-minute delivery in Hinjewadi, Baner, Aundh and Kothrud.",
    best: "Tech areas, branded products",
  },
  {
    name: "Zepto",
    color: "#7c3aed",
    emoji: "🟣",
    verdict: "Competitive pricing in Pune. Often cheapest on fresh produce. Popular with Pune's IT workforce in Hinjewadi and Wakad.",
    best: "Fresh produce, IT areas",
  },
  {
    name: "Swiggy Instamart",
    color: "#f97316",
    emoji: "🟠",
    verdict: "Good for Swiggy One subscribers in Pune. Frequent coupons. Coverage across all major Pune areas including Pimpri-Chinchwad.",
    best: "Swiggy One users, all areas",
  },
  {
    name: "BigBasket",
    color: "#84c225",
    emoji: "🟢",
    verdict: "Best for planned weekly shops in Pune. Cheapest on staples. BB Royal private label excellent value. Strong scheduled delivery.",
    best: "Staples, weekly shopping",
  },
  {
    name: "JioMart",
    color: "#0a73ba",
    emoji: "🔵",
    verdict: "Competitive on staples and bulk packs in Pune. Good for value shoppers in outer Pune and Pimpri-Chinchwad areas.",
    best: "Staples, bulk packs, value",
  },
];

export default function GroceryPricesPunePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-3">
            📍 Pune — Grocery Price Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Grocery Prices in Pune 2026
          </h1>
          <p className="text-green-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart prices in Pune.
            Find the cheapest grocery delivery in your area. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-green-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-green-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Pune Grocery Prices
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
              { value: "15+",  label: "Pune Areas" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-green-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Pune areas ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">
            Grocery Delivery Areas in Pune
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            All major quick-commerce platforms operate across Pune and Pimpri-Chinchwad.
            PriceBasket compares prices so you always pay the least in your neighbourhood.
          </p>
          <div className="flex flex-wrap gap-2">
            {PUNE_AREAS.map((area) => (
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
            Which App is Cheapest in Pune?
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

        {/* ── FAQ ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Pune Grocery FAQs
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Which grocery app is cheapest in Pune in 2026?",
                a: "No single app is always cheapest in Pune. Blinkit, Zepto and Instamart all compete in Pune's tech areas. BigBasket wins on staples. PriceBasket compares all 8 apps in real-time so Pune shoppers always find the cheapest option.",
              },
              {
                q: "Does Zepto deliver in Hinjewadi?",
                a: "Yes, Zepto covers Hinjewadi and most of Pune's IT corridors. Blinkit and Swiggy Instamart also have strong Pune coverage. Use PriceBasket to compare prices across all platforms in your area.",
              },
              {
                q: "How do I get the cheapest grocery delivery in Pune?",
                a: "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart and more. Free, no app download needed. Saves Pune shoppers ₹340 per order on average.",
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
            {[
              { label: "Mumbai",    href: "/grocery-prices-mumbai" },
              { label: "Delhi",     href: "/grocery-prices-delhi" },
              { label: "Bangalore", href: "/grocery-prices-bangalore" },
              { label: "Hyderabad", href: "/grocery-prices-hyderabad" },
              { label: "Chennai",   href: "/grocery-prices-chennai" },
            ].map((c) => (
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
            Find Cheapest Groceries in Pune Now
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
