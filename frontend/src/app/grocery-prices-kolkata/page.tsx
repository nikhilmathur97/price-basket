import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grocery Prices in Kolkata 2026 — Blinkit vs Zepto",
  description:
    "Compare grocery prices in Kolkata across Blinkit, Zepto, Instamart, BigBasket & JioMart. Find cheapest grocery delivery in Kolkata. Save ₹500/month. Free.",
  keywords: [
    "grocery prices kolkata",
    "cheapest grocery delivery kolkata",
    "blinkit kolkata prices",
    "zepto kolkata prices",
    "bigbasket kolkata",
    "swiggy instamart kolkata",
    "online grocery kolkata",
    "grocery comparison kolkata",
    "cheap groceries kolkata",
    "grocery delivery kolkata 2026",
  ],
  alternates: { canonical: "https://pricebasket.in/grocery-prices-kolkata" },
  openGraph: {
    title: "Grocery Prices in Kolkata 2026 — Blinkit vs Zepto vs BigBasket",
    description: "Compare grocery prices across all apps in Kolkata. Find cheapest delivery. Free.",
    url: "https://pricebasket.in/grocery-prices-kolkata",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which grocery app is cheapest in Kolkata?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No single app is always cheapest in Kolkata. Blinkit, Zepto and Swiggy Instamart all operate in Kolkata. BigBasket has strong coverage. PriceBasket compares all 8 apps in real-time so Kolkata shoppers always find the cheapest price.",
      },
    },
    {
      "@type": "Question",
      name: "Does Blinkit deliver in Salt Lake and New Town Kolkata?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Blinkit covers major Kolkata areas including Salt Lake, New Town, Park Street, Ballygunge, Behala and more. Zepto and Swiggy Instamart also have growing Kolkata coverage.",
      },
    },
    {
      "@type": "Question",
      name: "How much can I save on groceries in Kolkata?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kolkata shoppers using PriceBasket save an average of Rs 340 per order and Rs 500-2,000 per month. The same product can cost 15-40% more on one platform vs another in Kolkata.",
      },
    },
  ],
};

const KOLKATA_AREAS = [
  "Salt Lake", "New Town", "Park Street", "Ballygunge",
  "Behala", "Howrah", "Dum Dum", "Barasat",
  "Jadavpur", "Tollygunge", "Gariahat", "Alipore",
  "Shyambazar", "Ultadanga", "Rajarhat",
];

const PLATFORMS = [
  {
    name: "Blinkit",
    color: "#f8cb46",
    emoji: "⚡",
    verdict: "Growing network in Kolkata. Best for branded FMCG and 10-minute delivery in Salt Lake, New Town and Park Street areas.",
    best: "Branded products, Salt Lake/New Town",
  },
  {
    name: "Zepto",
    color: "#7c3aed",
    emoji: "🟣",
    verdict: "Expanding rapidly in Kolkata. Competitive pricing on fresh produce and dairy. Strong in New Town and Rajarhat IT corridors.",
    best: "Fresh produce, New Town/Rajarhat",
  },
  {
    name: "Swiggy Instamart",
    color: "#f97316",
    emoji: "🟠",
    verdict: "Good for Swiggy One subscribers in Kolkata. Frequent coupons. Coverage across most Kolkata areas. Integrated with Swiggy food.",
    best: "Swiggy One users, all areas",
  },
  {
    name: "BigBasket",
    color: "#84c225",
    emoji: "🟢",
    verdict: "Excellent coverage in Kolkata. Best for planned weekly shops and staples. BB Royal private label is excellent value. Strong scheduled delivery.",
    best: "Staples, weekly shopping",
  },
  {
    name: "JioMart",
    color: "#0a73ba",
    emoji: "🔵",
    verdict: "Competitive on staples and bulk packs in Kolkata. Good for value shoppers. Expanding coverage across Kolkata and Howrah.",
    best: "Staples, bulk packs, value",
  },
];

const FAQS = [
  {
    q: "Which grocery app is cheapest in Kolkata in 2026?",
    a: "No single app is always cheapest in Kolkata. Blinkit, Zepto and Instamart all compete in Kolkata. BigBasket has excellent coverage and wins on staples. PriceBasket compares all 8 apps in real-time so Kolkata shoppers always find the cheapest option.",
  },
  {
    q: "Does Zepto deliver in Salt Lake and Rajarhat?",
    a: "Yes, Zepto covers Salt Lake, Rajarhat, New Town and most of Kolkata. Blinkit and Swiggy Instamart also have strong Kolkata coverage. Use PriceBasket to compare prices across all platforms in your area.",
  },
  {
    q: "Is BigBasket cheaper in Kolkata?",
    a: "BigBasket has excellent coverage and competitive prices in Kolkata, especially on staples and BB Royal private label. However, Zepto and Blinkit often beat BigBasket on quick-commerce items. Use PriceBasket to compare all platforms.",
  },
  {
    q: "How do I get the cheapest grocery delivery in Kolkata?",
    a: "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart and more. Free, no app download needed. Saves Kolkata shoppers Rs 340 per order on average.",
  },
];

export default function GroceryPricesKolkataPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-sky-200 text-xs font-bold uppercase tracking-widest mb-3">
            📍 Kolkata — Grocery Price Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Grocery Prices in Kolkata 2026
          </h1>
          <p className="text-sky-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart prices in Kolkata.
            Find the cheapest grocery delivery in your area. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-sky-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-sky-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Kolkata Grocery Prices
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
              { value: "15+",  label: "Kolkata Areas" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-sky-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Kolkata areas ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">
            Grocery Delivery Areas in Kolkata
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            Blinkit, Zepto, Swiggy Instamart and BigBasket deliver across all major Kolkata areas.
            PriceBasket compares prices so you always pay the least.
          </p>
          <div className="flex flex-wrap gap-2">
            {KOLKATA_AREAS.map((area) => (
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
            Which App is Cheapest in Kolkata?
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
            Compare Grocery Apps in Kolkata
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Blinkit vs Zepto in Kolkata",     href: "/compare/blinkit-vs-zepto" },
              { label: "Zepto vs Instamart in Kolkata",   href: "/compare/zepto-vs-instamart" },
              { label: "Blinkit vs BigBasket in Kolkata", href: "/compare/blinkit-vs-bigbasket" },
              { label: "BigBasket vs JioMart in Kolkata", href: "/compare/bigbasket-vs-jiomart" },
            ].map((pair) => (
              <Link key={pair.href} href={pair.href}
                className="bg-white rounded-2xl border border-surface-100 p-4
                           hover:border-brand-300 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-surface-900 text-sm group-hover:text-brand-600">
                    {pair.label}
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
            Kolkata Grocery FAQs
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
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
              { label: "Pune",      href: "/grocery-prices-pune" },
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
            Find Cheapest Groceries in Kolkata Now
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
