import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grocery Prices in Ahmedabad 2026 — Compare Blinkit, Zepto, BigBasket | PriceBasket",
  description:
    "Compare grocery prices in Ahmedabad across Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart. Find cheapest grocery delivery in Ahmedabad. Save ₹500/month. Free price alerts.",
  keywords: [
    "grocery prices ahmedabad",
    "cheapest grocery delivery ahmedabad",
    "blinkit ahmedabad prices",
    "zepto ahmedabad prices",
    "bigbasket ahmedabad",
    "swiggy instamart ahmedabad",
    "online grocery ahmedabad",
    "grocery comparison ahmedabad",
    "cheap groceries ahmedabad",
    "grocery delivery ahmedabad 2026",
    "grocery prices surat",
    "grocery prices gujarat",
  ],
  alternates: { canonical: "https://pricebasket.in/grocery-prices-ahmedabad" },
  openGraph: {
    title: "Grocery Prices in Ahmedabad 2026 — Blinkit vs Zepto vs BigBasket",
    description: "Compare grocery prices across all apps in Ahmedabad. Find cheapest delivery. Free.",
    url: "https://pricebasket.in/grocery-prices-ahmedabad",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which grocery app is cheapest in Ahmedabad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No single app is always cheapest in Ahmedabad. Blinkit, Zepto and Swiggy Instamart all operate in Ahmedabad. BigBasket has strong coverage. PriceBasket compares all 8 apps in real-time so Ahmedabad shoppers always find the cheapest price.",
      },
    },
    {
      "@type": "Question",
      name: "Does Blinkit deliver in Satellite and Prahlad Nagar Ahmedabad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Blinkit covers major Ahmedabad areas including Satellite, Prahlad Nagar, Navrangpura, Bodakdev, Vastrapur and more. Zepto and Swiggy Instamart also have growing Ahmedabad coverage.",
      },
    },
    {
      "@type": "Question",
      name: "How much can I save on groceries in Ahmedabad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ahmedabad shoppers using PriceBasket save an average of Rs 340 per order and Rs 500-2,000 per month. The same product can cost 15-40% more on one platform vs another in Ahmedabad.",
      },
    },
  ],
};

const AHMEDABAD_AREAS = [
  "Satellite", "Prahlad Nagar", "Navrangpura", "Bodakdev",
  "Vastrapur", "Thaltej", "SG Highway", "Bopal",
  "Maninagar", "Naranpura", "Chandkheda", "Gota",
  "Iscon", "Ambawadi", "Science City",
];

const PLATFORMS = [
  {
    name: "Blinkit",
    color: "#f8cb46",
    emoji: "⚡",
    verdict: "Growing network in Ahmedabad. Best for branded FMCG and 10-minute delivery in Satellite, Prahlad Nagar and SG Highway areas.",
    best: "Branded products, Satellite/SG Highway",
  },
  {
    name: "Zepto",
    color: "#7c3aed",
    emoji: "🟣",
    verdict: "Expanding rapidly in Ahmedabad. Competitive pricing on fresh produce and dairy. Strong in Bodakdev and Thaltej areas.",
    best: "Fresh produce, Bodakdev/Thaltej",
  },
  {
    name: "Swiggy Instamart",
    color: "#f97316",
    emoji: "🟠",
    verdict: "Good for Swiggy One subscribers in Ahmedabad. Frequent coupons. Coverage across most Ahmedabad areas. Integrated with Swiggy food.",
    best: "Swiggy One users, all areas",
  },
  {
    name: "BigBasket",
    color: "#84c225",
    emoji: "🟢",
    verdict: "Excellent coverage in Ahmedabad. Best for planned weekly shops and staples. BB Royal private label is excellent value. Strong scheduled delivery.",
    best: "Staples, weekly shopping",
  },
  {
    name: "JioMart",
    color: "#0a73ba",
    emoji: "🔵",
    verdict: "Competitive on staples and bulk packs in Ahmedabad. Good for value shoppers. Strong in outer Ahmedabad and Gandhinagar areas.",
    best: "Staples, bulk packs, Gandhinagar",
  },
];

const FAQS = [
  {
    q: "Which grocery app is cheapest in Ahmedabad in 2026?",
    a: "No single app is always cheapest in Ahmedabad. Blinkit, Zepto and Instamart all compete in Ahmedabad. BigBasket has excellent coverage and wins on staples. PriceBasket compares all 8 apps in real-time so Ahmedabad shoppers always find the cheapest option.",
  },
  {
    q: "Does Zepto deliver in Bopal and Thaltej?",
    a: "Yes, Zepto covers Bopal, Thaltej, Bodakdev and most of Ahmedabad. Blinkit and Swiggy Instamart also have strong Ahmedabad coverage. Use PriceBasket to compare prices across all platforms in your area.",
  },
  {
    q: "Is BigBasket cheaper in Ahmedabad?",
    a: "BigBasket has excellent coverage and competitive prices in Ahmedabad, especially on staples and BB Royal private label. However, Zepto and Blinkit often beat BigBasket on quick-commerce items. Use PriceBasket to compare all platforms.",
  },
  {
    q: "How do I get the cheapest grocery delivery in Ahmedabad?",
    a: "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart and more. Free, no app download needed. Saves Ahmedabad shoppers Rs 340 per order on average.",
  },
];

export default function GroceryPricesAhmedabadPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-3">
            📍 Ahmedabad — Grocery Price Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Grocery Prices in Ahmedabad 2026
          </h1>
          <p className="text-violet-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart prices in Ahmedabad.
            Find the cheapest grocery delivery in your area. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-violet-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-violet-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Ahmedabad Grocery Prices
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
              { value: "15+",  label: "Ahmedabad Areas" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-violet-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Ahmedabad areas ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">
            Grocery Delivery Areas in Ahmedabad
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            Blinkit, Zepto, Swiggy Instamart and BigBasket deliver across all major Ahmedabad areas.
            PriceBasket compares prices so you always pay the least.
          </p>
          <div className="flex flex-wrap gap-2">
            {AHMEDABAD_AREAS.map((area) => (
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
            Which App is Cheapest in Ahmedabad?
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
            Compare Grocery Apps in Ahmedabad
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Blinkit vs Zepto in Ahmedabad",     href: "/compare/blinkit-vs-zepto" },
              { label: "Zepto vs Instamart in Ahmedabad",   href: "/compare/zepto-vs-instamart" },
              { label: "Blinkit vs BigBasket in Ahmedabad", href: "/compare/blinkit-vs-bigbasket" },
              { label: "BigBasket vs JioMart in Ahmedabad", href: "/compare/bigbasket-vs-jiomart" },
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
            Ahmedabad Grocery FAQs
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
              { label: "Kolkata",   href: "/grocery-prices-kolkata" },
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
            Find Cheapest Groceries in Ahmedabad Now
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
