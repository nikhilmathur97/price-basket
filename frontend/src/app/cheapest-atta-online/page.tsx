import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Atta Online India 2026 — Blinkit vs Zepto vs BigBasket Atta Price | PriceBasket",
  description:
    "Compare atta prices across Blinkit, Zepto, BigBasket, JioMart, Instamart. Find cheapest 5kg, 10kg atta online in India. Aashirvaad, Pillsbury, BB Royal atta price comparison. Free.",
  keywords: [
    "cheapest atta online india",
    "atta price comparison india",
    "aashirvaad atta price blinkit zepto",
    "cheapest atta blinkit",
    "zepto atta price",
    "bigbasket atta price",
    "5kg atta price online",
    "10kg atta price online",
    "wheat flour price comparison india",
    "atta price today india",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-atta-online" },
  openGraph: {
    title: "Cheapest Atta Online India 2026 — Compare Blinkit, Zepto, BigBasket Atta Prices",
    description: "Find cheapest atta prices across 8 grocery apps. Aashirvaad, Pillsbury, BB Royal. Free comparison.",
    url: "https://pricebasket.in/cheapest-atta-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest atta price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Atta prices vary daily across platforms. BigBasket's BB Royal atta is typically 20–30% cheaper than Aashirvaad. JioMart and DMart Ready often have the lowest prices on bulk atta packs. PriceBasket compares all platforms in real-time so you always find the cheapest atta price.",
      },
    },
    {
      "@type": "Question",
      name: "What is the price of Aashirvaad atta on Blinkit vs Zepto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aashirvaad atta prices differ between Blinkit and Zepto and change frequently. Use PriceBasket to compare current Aashirvaad atta prices across Blinkit, Zepto, BigBasket, Instamart and JioMart in real-time.",
      },
    },
    {
      "@type": "Question",
      name: "Is private label atta cheaper than Aashirvaad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, private label atta like BigBasket's BB Royal, Zepto's store brand, and JioMart's private label are typically 20–35% cheaper than Aashirvaad or Pillsbury with comparable quality for everyday cooking.",
      },
    },
  ],
};

const ATTA_BRANDS = [
  { brand: "Aashirvaad Atta",    sizes: ["1kg", "5kg", "10kg"], note: "Most popular brand in India" },
  { brand: "Pillsbury Atta",     sizes: ["1kg", "5kg", "10kg"], note: "Good for soft rotis" },
  { brand: "BB Royal Atta",      sizes: ["5kg", "10kg"],        note: "BigBasket private label — 25% cheaper" },
  { brand: "Zepto Atta",         sizes: ["5kg", "10kg"],        note: "Zepto private label — value pick" },
  { brand: "Fortune Atta",       sizes: ["5kg", "10kg"],        note: "Popular in South India" },
  { brand: "Shakti Bhog Atta",   sizes: ["5kg", "10kg"],        note: "Budget-friendly option" },
  { brand: "Patanjali Atta",     sizes: ["5kg", "10kg"],        note: "Organic option" },
  { brand: "JioMart Atta",       sizes: ["5kg", "10kg"],        note: "JioMart private label — bulk value" },
];

const SAVING_TIPS = [
  { tip: "Buy 10kg instead of 5kg",          saving: "Save 10–15% per kg" },
  { tip: "Choose private label over branded", saving: "Save 20–35%" },
  { tip: "Compare all 8 apps before buying",  saving: "Save ₹30–₹80 per pack" },
  { tip: "Set a price alert on PriceBasket",  saving: "Catch flash sales" },
  { tip: "Buy on weekday mornings",           saving: "Extra 5–10% off" },
];

export default function CheapestAttaOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-amber-600 via-yellow-700 to-orange-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-3">
            🌾 Atta Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Atta Online India 2026
          </h1>
          <p className="text-amber-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Aashirvaad, Pillsbury, BB Royal atta prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest atta price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=atta"
              className="bg-white text-amber-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-amber-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Atta Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Atta Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "35%",  label: "Max Saving on Atta" },
              { value: "Free", label: "Always Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-amber-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Key insight ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-amber-800 mb-1">💡 Key Insight</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            The same 5kg Aashirvaad atta can cost <strong>₹30–₹60 more</strong> on one platform vs another.
            Private label atta (BB Royal, Zepto brand) is <strong>20–35% cheaper</strong> than Aashirvaad
            with comparable quality. PriceBasket compares all options in real-time.
          </p>
        </div>

        {/* ── Atta brands ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Atta Brands — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ATTA_BRANDS.map((b) => (
              <div key={b.brand} className="bg-white rounded-2xl border border-surface-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-surface-900 text-sm">{b.brand}</p>
                    <p className="text-[11px] text-surface-500 mt-0.5">{b.note}</p>
                    <div className="flex gap-1 mt-2">
                      {b.sizes.map((s) => (
                        <span key={s} className="text-[10px] font-bold bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/search?q=${encodeURIComponent(b.brand)}`}
                    className="text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-100
                               px-3 py-1.5 rounded-xl whitespace-nowrap flex-shrink-0 hover:bg-brand-100 transition-colors"
                  >
                    Compare →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Saving tips ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            5 Ways to Save on Atta in India
          </h2>
          <div className="space-y-2">
            {SAVING_TIPS.map((t, i) => (
              <div key={t.tip} className="bg-white rounded-xl border border-surface-100 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-surface-700">{t.tip}</span>
                </div>
                <span className="text-xs font-bold text-green-600 whitespace-nowrap">{t.saving}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platform comparison ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Where to Buy Cheapest Atta Online
          </h2>
          <div className="space-y-3">
            {[
              { name: "BigBasket",  color: "#84c225", emoji: "🟢", verdict: "Best for atta — BB Royal private label is 25% cheaper than Aashirvaad. Huge range of pack sizes. Scheduled delivery." },
              { name: "JioMart",    color: "#0a73ba", emoji: "🔵", verdict: "Very competitive on bulk atta packs. Often cheapest on 10kg packs. Good for monthly stock-up." },
              { name: "Blinkit",    color: "#f8cb46", emoji: "⚡", verdict: "Good range of atta brands. Convenient for urgent needs. 10-minute delivery. Prices competitive on branded atta." },
              { name: "Zepto",      color: "#7c3aed", emoji: "🟣", verdict: "Competitive atta prices. Zepto private label atta is good value. Fast delivery." },
              { name: "DMart Ready",color: "#008752", emoji: "🟩", verdict: "Lowest prices on bulk atta packs. DMart's everyday-low-price model works well for staples like atta." },
            ].map((p) => (
              <div key={p.name} className="bg-white rounded-2xl border border-surface-100 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: p.color + "22", border: `2px solid ${p.color}44` }}>
                  {p.emoji}
                </div>
                <div>
                  <p className="font-extrabold text-surface-900 text-sm">{p.name}</p>
                  <p className="text-[13px] text-surface-600 leading-relaxed mt-0.5">{p.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Atta Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Which app has the cheapest atta price in India?",
                a: "Atta prices vary daily. BigBasket's BB Royal and JioMart typically have the lowest atta prices. For branded atta like Aashirvaad, compare across all platforms on PriceBasket to find today's cheapest price.",
              },
              {
                q: "Is private label atta as good as Aashirvaad?",
                a: "For everyday rotis and parathas, private label atta (BB Royal, Zepto brand) is comparable to Aashirvaad at 20–35% lower price. Aashirvaad has a slight edge for very soft rotis due to its wheat blend.",
              },
              {
                q: "Should I buy 5kg or 10kg atta?",
                a: "10kg packs are 10–15% cheaper per kg than 5kg packs. If you use atta regularly (most Indian households do), buying 10kg saves money. JioMart and BigBasket have the best 10kg atta prices.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-2">{faq.q}</h3>
                <p className="text-[13px] text-surface-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related product pages ── */}
        <section className="mb-8">
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            Compare Other Grocery Staples
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Cheapest Milk Online",  href: "/cheapest-milk-online" },
              { label: "Cheapest Oil Online",   href: "/cheapest-oil-online" },
              { label: "Best Grocery Deals",    href: "/best-grocery-deals" },
              { label: "Save Money Groceries",  href: "/save-money-groceries" },
              { label: "Blinkit vs Zepto",      href: "/compare/blinkit-vs-zepto" },
              { label: "BigBasket vs JioMart",  href: "/compare/bigbasket-vs-jiomart" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="bg-white rounded-xl border border-surface-100 p-3 text-sm font-semibold
                           text-brand-600 hover:border-brand-300 hover:shadow-sm transition-all text-center">
                {l.label} →
              </Link>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">
            Find Cheapest Atta Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=atta"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🌾 Compare Atta Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Atta Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
