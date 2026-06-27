import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grocery Prices in Chennai 2026 — Compare Blinkit, Zepto, BigBasket | PriceBasket",
  description:
    "Compare grocery prices in Chennai across Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart. Find cheapest grocery delivery in Chennai. Save ₹500/month. Free price alerts.",
  keywords: [
    "grocery prices chennai",
    "cheapest grocery delivery chennai",
    "blinkit chennai prices",
    "zepto chennai prices",
    "bigbasket chennai",
    "swiggy instamart chennai",
    "online grocery chennai",
    "grocery comparison chennai",
    "cheap groceries chennai",
    "grocery delivery chennai 2026",
  ],
  alternates: { canonical: "https://pricebasket.in/grocery-prices-chennai" },
  openGraph: {
    title: "Grocery Prices in Chennai 2026 — Blinkit vs Zepto vs BigBasket",
    description: "Compare grocery prices across all apps in Chennai. Find cheapest delivery. Free.",
    url: "https://pricebasket.in/grocery-prices-chennai",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which grocery app is cheapest in Chennai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No single app is always cheapest in Chennai. Blinkit, Zepto and Swiggy Instamart all operate in Chennai. BigBasket has strong coverage. PriceBasket compares all 8 apps in real-time so Chennai shoppers always find the cheapest price.",
      },
    },
    {
      "@type": "Question",
      name: "Does Blinkit deliver in Anna Nagar and T Nagar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Blinkit covers major Chennai areas including Anna Nagar, T Nagar, Adyar, Velachery, OMR and more. Zepto and Swiggy Instamart also have growing Chennai coverage.",
      },
    },
  ],
};

const CHENNAI_AREAS = [
  "Anna Nagar", "T Nagar", "Adyar", "Velachery",
  "OMR", "Porur", "Tambaram", "Chromepet",
  "Nungambakkam", "Mylapore", "Perambur", "Ambattur",
  "Sholinganallur", "Pallikaranai", "Guindy",
];

const PLATFORMS = [
  { name: "Blinkit",          color: "#f8cb46", emoji: "⚡", verdict: "Growing network in Chennai. Best for branded FMCG and 10-minute delivery in major areas like Anna Nagar, T Nagar and Adyar.", best: "Branded products, major areas" },
  { name: "Zepto",            color: "#7c3aed", emoji: "🟣", verdict: "Expanding rapidly in Chennai. Competitive pricing on fresh produce and dairy. Strong in OMR and IT corridor areas.", best: "Fresh produce, OMR corridor" },
  { name: "Swiggy Instamart", color: "#f97316", emoji: "🟠", verdict: "Good for Swiggy One subscribers in Chennai. Frequent coupons. Coverage across most Chennai areas. Integrated with Swiggy food.", best: "Swiggy One users, all areas" },
  { name: "BigBasket",        color: "#84c225", emoji: "🟢", verdict: "Excellent coverage in Chennai. Best for planned weekly shops and staples. BB Royal private label is excellent value.", best: "Staples, weekly shopping" },
  { name: "JioMart",          color: "#0a73ba", emoji: "🔵", verdict: "Competitive on staples and bulk packs in Chennai. Good for value shoppers. Expanding coverage in outer Chennai areas.", best: "Staples, bulk packs, value" },
];

export default function GroceryPricesChennaiPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="bg-gradient-to-br from-orange-600 via-amber-700 to-yellow-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-orange-200 text-xs font-bold uppercase tracking-widest mb-3">📍 Chennai — Grocery Price Comparison</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">Grocery Prices in Chennai 2026</h1>
          <p className="text-orange-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart prices in Chennai.
            Find the cheapest grocery delivery in your area. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search" className="bg-white text-orange-700 font-extrabold px-8 py-3.5 rounded-2xl hover:bg-orange-50 transition-colors shadow-lg text-sm">
              🔍 Compare Chennai Grocery Prices
            </Link>
            <Link href="/alerts" className="bg-white/20 border border-white/40 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Price Alert
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">Grocery Delivery Areas in Chennai</h2>
          <div className="flex flex-wrap gap-2 mt-4">
            {CHENNAI_AREAS.map((area) => (
              <span key={area} className="text-sm font-semibold bg-white border border-surface-200 text-surface-700 px-3 py-1.5 rounded-full">📍 {area}</span>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Which App is Cheapest in Chennai?</h2>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl border border-surface-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: p.color + "22", border: `2px solid ${p.color}44` }}>{p.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-extrabold text-surface-900">{p.name}</p>
                      <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Best for: {p.best}</span>
                    </div>
                    <p className="text-sm text-surface-600 leading-relaxed">{p.verdict}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Chennai Grocery FAQs</h2>
          <div className="space-y-3">
            {[
              { q: "Which grocery app is cheapest in Chennai in 2026?", a: "No single app is always cheapest in Chennai. Blinkit, Zepto and Instamart all compete in Chennai. BigBasket has excellent coverage. PriceBasket compares all 8 apps in real-time so Chennai shoppers always find the cheapest option." },
              { q: "How do I get the cheapest grocery delivery in Chennai?", a: "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart and more. Free, no app download needed. Saves Chennai shoppers ₹340 per order on average." },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-2">{faq.q}</h3>
                <p className="text-[13px] text-surface-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-extrabold text-surface-900 mb-3">Grocery Prices in Other Cities</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Mumbai",    href: "/grocery-prices-mumbai" },
              { label: "Delhi",     href: "/grocery-prices-delhi" },
              { label: "Bangalore", href: "/grocery-prices-bangalore" },
              { label: "Hyderabad", href: "/grocery-prices-hyderabad" },
              { label: "Pune",      href: "/grocery-prices-pune" },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="text-sm font-semibold bg-white border border-surface-200 text-brand-600 hover:border-brand-300 px-4 py-2 rounded-xl transition-colors">
                📍 {c.label} →
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">Find Cheapest Groceries in Chennai Now</h2>
          <p className="text-orange-100 text-sm mb-5">Free forever. No app download. Compare 8 platforms in 2 seconds.</p>
          <Link href="/search" className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl hover:bg-orange-50 transition-colors text-sm inline-block">
            🔍 Compare Prices Now
          </Link>
        </div>
      </div>
    </div>
  );
}
