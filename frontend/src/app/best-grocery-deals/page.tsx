import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Best Grocery Deals India 2026 — Blinkit vs Zepto",
  description:
    "Find the best grocery deals across Blinkit, Zepto, Instamart, BigBasket & JioMart. Compare prices in real-time. Save ₹500/month. Free price alerts.",
  keywords: [
    "best grocery deals india",
    "cheapest grocery app india 2026",
    "blinkit deals today",
    "zepto deals today",
    "bigbasket offers today",
    "swiggy instamart deals",
    "grocery discounts india",
    "online grocery offers india",
    "grocery cashback offers india",
    "best grocery app india",
  ],
  alternates: { canonical: "https://pricebasket.in/best-grocery-deals" },
  openGraph: {
    title: "Best Grocery Deals India 2026 — Compare Blinkit, Zepto, BigBasket",
    description: "Real-time grocery price comparison across 8 apps. Find cheapest deals. Free price alerts.",
    url: "https://pricebasket.in/best-grocery-deals",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Which grocery app has the best deals in India in 2026?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No single app always has the best deals — prices change daily across Blinkit, Zepto, Swiggy Instamart, BigBasket, and JioMart. PriceBasket compares all 8 platforms in real-time so you always find the cheapest price for your specific cart.",
      },
    },
    {
      "@type": "Question",
      "name": "How do I find the cheapest grocery delivery in India?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use PriceBasket.in — search any product and instantly see prices across Blinkit, Zepto, Instamart, BigBasket, JioMart, Amazon Fresh, Flipkart Minutes and DMart. It's free and works without downloading any app.",
      },
    },
    {
      "@type": "Question",
      "name": "How much can I save on groceries in India?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PriceBasket users save an average of ₹340 per order and ₹500–₹2,000 per month. The same product can cost 15–40% more on one platform vs another. Over a year, that's ₹6,000–₹24,000 in savings.",
      },
    },
  ],
};

const PLATFORMS = [
  { name: "Blinkit",          color: "#f8cb46", emoji: "⚡", desc: "10-min delivery, widest network",      compare: "/compare/blinkit-vs-zepto" },
  { name: "Zepto",            color: "#7c3aed", emoji: "🟣", desc: "Aggressive pricing, private labels",   compare: "/compare/zepto-vs-instamart" },
  { name: "Swiggy Instamart", color: "#f97316", emoji: "🟠", desc: "Swiggy One perks, fresh range",        compare: "/compare/blinkit-vs-instamart" },
  { name: "BigBasket",        color: "#84c225", emoji: "🟢", desc: "Best on staples, huge catalog",        compare: "/compare/blinkit-vs-bigbasket" },
  { name: "JioMart",          color: "#0a73ba", emoji: "🔵", desc: "Low staple prices, wide reach",        compare: "/compare/bigbasket-vs-jiomart" },
  { name: "Amazon Fresh",     color: "#ff9900", emoji: "🟡", desc: "Prime benefits, coupon stacking",      compare: "/compare/amazon-vs-blinkit" },
  { name: "Flipkart Minutes", color: "#2874f0", emoji: "🔷", desc: "Fast-growing, launch offers",          compare: "/compare/flipkart-vs-zepto" },
  { name: "DMart Ready",      color: "#008752", emoji: "🟩", desc: "Lowest staple prices, bulk value",     compare: "/compare/bigbasket-vs-jiomart" },
];

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
  "Surat", "Kochi", "Chandigarh", "Indore", "Nagpur",
];

const COMPARE_PAIRS = [
  { label: "Blinkit vs Zepto",       href: "/compare/blinkit-vs-zepto",     searches: "90,000/month" },
  { label: "Zepto vs Instamart",     href: "/compare/zepto-vs-instamart",   searches: "40,000/month" },
  { label: "Blinkit vs BigBasket",   href: "/compare/blinkit-vs-bigbasket", searches: "25,000/month" },
  { label: "BigBasket vs JioMart",   href: "/compare/bigbasket-vs-jiomart", searches: "18,000/month" },
  { label: "Zepto vs BigBasket",     href: "/compare/zepto-vs-bigbasket",   searches: "15,000/month" },
  { label: "Blinkit vs Instamart",   href: "/compare/blinkit-vs-instamart", searches: "12,000/month" },
];

export default function BestGroceryDealsPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-orange-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-orange-200 text-xs font-bold uppercase tracking-widest mb-3">
            India&apos;s #1 Grocery Price Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Best Grocery Deals in India 2026
          </h1>
          <p className="text-orange-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart and 3 more platforms
            in real-time. Find the cheapest price for every product. Save ₹500–₹2,000/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-brand-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-orange-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Prices Now — Free
            </Link>
            <a
              href="https://wa.me/918005828390?text=Hi%2C%20I%20want%20daily%20grocery%20deals!"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-green-600 transition-colors shadow-lg text-sm"
            >
              💬 Get Deals on WhatsApp
            </a>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",       label: "Platforms Compared" },
              { value: "₹340",    label: "Avg Saving/Order" },
              { value: "10,000+", label: "Products Tracked" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-orange-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── How it works ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            How to Find the Best Grocery Deals in India
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "1", emoji: "🔍", title: "Search Any Product", desc: "Type any grocery item — milk, atta, oil, shampoo, anything." },
              { step: "2", emoji: "📊", title: "Compare All Prices",  desc: "See prices from Blinkit, Zepto, BigBasket, Instamart side by side instantly." },
              { step: "3", emoji: "💰", title: "Buy Cheapest",        desc: "Click 'Buy' on the cheapest platform. Save ₹340 per order on average." },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-surface-100 p-5 text-center">
                <div className="w-8 h-8 bg-brand-600 text-white rounded-full flex items-center
                                justify-center font-black text-sm mx-auto mb-3">
                  {s.step}
                </div>
                <div className="text-2xl mb-2">{s.emoji}</div>
                <p className="font-extrabold text-surface-900 text-sm mb-1">{s.title}</p>
                <p className="text-xs text-surface-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platform comparison ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            All 8 Grocery Apps Compared
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {PLATFORMS.map((p) => (
              <div key={p.name}
                className="bg-white rounded-2xl border border-surface-100 p-4
                           flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center
                               text-lg font-black flex-shrink-0"
                    style={{ backgroundColor: p.color + "22", border: `2px solid ${p.color}44` }}
                  >
                    {p.emoji}
                  </div>
                  <div>
                    <p className="font-extrabold text-surface-900 text-sm">{p.name}</p>
                    <p className="text-[11px] text-surface-500">{p.desc}</p>
                  </div>
                </div>
                <Link href={p.compare}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700
                             bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-xl
                             whitespace-nowrap flex-shrink-0 transition-colors">
                  Compare →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Deals by platform ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Today&apos;s Offers by App
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { slug: "blinkit",   label: "Blinkit Offers",      emoji: "🟡" },
              { slug: "zepto",     label: "Zepto Discounts",     emoji: "🟣" },
              { slug: "bigbasket", label: "BigBasket Sale",      emoji: "🟢" },
              { slug: "instamart", label: "Instamart Offers",    emoji: "🟠" },
              { slug: "jiomart",   label: "JioMart Deals",       emoji: "🔵" },
              { slug: "amazon",    label: "Amazon Fresh Deals",  emoji: "🟧" },
            ].map((d) => (
              <Link key={d.slug} href={`/deals/${d.slug}`}
                className="bg-white rounded-2xl border border-surface-100 p-4
                           hover:border-brand-300 hover:shadow-md transition-all group text-center">
                <div className="text-2xl mb-1">{d.emoji}</div>
                <p className="font-extrabold text-surface-900 text-sm group-hover:text-brand-600">
                  {d.label}
                </p>
                <span className="text-brand-500 text-[11px] font-bold">View deals →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Popular comparisons ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Most Popular Price Comparisons
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
                <p className="text-[11px] text-surface-400 mt-1">
                  🔍 {p.searches} searches
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── City coverage ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-2">
            Available Across India
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            PriceBasket tracks grocery prices in all major Indian cities where
            Blinkit, Zepto, Instamart and BigBasket operate.
          </p>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <span key={city}
                className="text-sm font-semibold bg-white border border-surface-200
                           text-surface-700 px-3 py-1.5 rounded-full">
                📍 {city}
              </span>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Which grocery app is cheapest in India in 2026?",
                a: "No single app is always cheapest — prices change daily. Zepto often wins on fresh produce, BigBasket on staples, and Blinkit on branded FMCG. PriceBasket compares all 8 apps in real-time so you always find the cheapest for your specific cart.",
              },
              {
                q: "Is PriceBasket free to use?",
                a: "Yes, 100% free. No app download needed. Compare prices, set unlimited price alerts, and use the cart optimizer at pricebasket.in — completely free.",
              },
              {
                q: "How much can I save using PriceBasket?",
                a: "Average saving is ₹340 per order. Most users save ₹500–₹2,000 per month. Over a year, that's ₹6,000–₹24,000 — just by buying from the cheapest platform each time.",
              },
              {
                q: "Does PriceBasket work in my city?",
                a: "PriceBasket works wherever Blinkit, Zepto, Instamart, BigBasket or JioMart operates — which covers 100+ cities across India including Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata and more.",
              },
              {
                q: "What is a price alert?",
                a: "Set a target price for any product. When any platform drops below your target, PriceBasket sends you an email notification. Never miss a deal again.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-2">{faq.q}</h3>
                <p className="text-[13px] text-surface-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">
            Start Saving on Groceries Today
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Free forever. No app download. Compare 8 platforms in 2 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm"
            >
              🔍 Compare Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
