import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Dal Online India 2026 — Blinkit vs Zepto",
  description:
    "Compare dal prices across Blinkit, Zepto, BigBasket & JioMart. Find cheapest toor dal, moong dal, chana dal online. 1kg, 5kg price comparison. Free.",
  keywords: [
    "cheapest dal online india",
    "dal price comparison india",
    "toor dal price blinkit zepto",
    "cheapest dal blinkit",
    "zepto dal price",
    "bigbasket dal price",
    "toor dal price today india",
    "moong dal price online",
    "chana dal price comparison",
    "arhar dal price india",
    "masoor dal price online",
    "pulses price comparison india",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-dal-online" },
  openGraph: {
    title: "Cheapest Dal Online India 2026 — Compare Blinkit, Zepto, BigBasket Dal Prices",
    description: "Find cheapest dal prices across 8 grocery apps. Toor dal, moong dal, chana dal. Free comparison.",
    url: "https://pricebasket.in/cheapest-dal-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest toor dal price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Toor dal prices vary significantly across platforms. JioMart and BigBasket typically have the lowest prices on 5kg dal packs. Private label dal from BB Royal is 20–30% cheaper than branded options. PriceBasket compares all 8 platforms in real-time.",
      },
    },
    {
      "@type": "Question",
      name: "Is toor dal cheaper on Blinkit or Zepto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Toor dal prices differ between Blinkit and Zepto and change frequently. The same 1kg toor dal can cost ₹15–₹40 more on one platform vs another. Use PriceBasket to compare current prices across all 8 platforms in real-time.",
      },
    },
    {
      "@type": "Question",
      name: "Which dal is cheapest in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Masoor dal (red lentils) is typically the cheapest dal in India, followed by moong dal. Toor dal (arhar) and chana dal are mid-range. Urad dal is usually the most expensive. Prices vary by season and platform — use PriceBasket to compare current prices.",
      },
    },
  ],
};

const DAL_VARIETIES = [
  { brand: "Toor Dal (Arhar)",    sizes: ["1kg", "5kg"], note: "Most popular — used for dal tadka" },
  { brand: "Moong Dal",           sizes: ["1kg", "5kg"], note: "Light, easy to digest" },
  { brand: "Chana Dal",           sizes: ["1kg", "5kg"], note: "Split chickpeas — versatile" },
  { brand: "Masoor Dal",          sizes: ["1kg", "5kg"], note: "Red lentils — cheapest dal" },
  { brand: "Urad Dal",            sizes: ["1kg", "5kg"], note: "Black gram — for dal makhani" },
  { brand: "BB Royal Dal",        sizes: ["1kg", "5kg"], note: "BigBasket private label — 25% cheaper" },
  { brand: "Rajma (Kidney Beans)",sizes: ["1kg", "5kg"], note: "Popular in North India" },
  { brand: "JioMart Dal",         sizes: ["1kg", "5kg"], note: "JioMart private label — value pick" },
];

const SAVING_TIPS = [
  { tip: "Buy 5kg instead of 1kg",            saving: "Save 15–20% per kg" },
  { tip: "Choose private label (BB Royal)",    saving: "Save 20–30%" },
  { tip: "Compare all 8 apps before buying",   saving: "Save ₹20–₹60 per kg" },
  { tip: "Set a price alert on PriceBasket",   saving: "Catch flash sales" },
  { tip: "Buy masoor dal instead of toor dal", saving: "Save 15–25%" },
];

const PLATFORMS = [
  { name: "BigBasket",   color: "#84c225", emoji: "🟢", verdict: "Best for dal — BB Royal private label is 25% cheaper than branded. Huge range of varieties. Scheduled delivery. Best on 5kg packs." },
  { name: "JioMart",     color: "#0a73ba", emoji: "🔵", verdict: "Very competitive on bulk dal packs. Often cheapest on 5kg packs. Good for monthly stock-up. Strong on all dal varieties." },
  { name: "DMart Ready", color: "#008752", emoji: "🟩", verdict: "Everyday-low-price model works well for pulses. Typically cheapest on bulk packs. Scheduled delivery." },
  { name: "Blinkit",     color: "#f8cb46", emoji: "⚡", verdict: "Good range of dal brands. Competitive on 1kg packs. 10-minute delivery for urgent needs." },
  { name: "Zepto",       color: "#7c3aed", emoji: "🟣", verdict: "Competitive dal prices. Frequent discounts on toor and moong dal. Fast delivery." },
];

export default function CheapestDalOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-orange-600 via-red-700 to-rose-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-orange-200 text-xs font-bold uppercase tracking-widest mb-3">
            🫘 Dal Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Dal Online India 2026
          </h1>
          <p className="text-orange-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare toor dal, moong dal, chana dal, masoor dal prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest dal price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=dal"
              className="bg-white text-orange-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-orange-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Dal Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Dal Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "30%",  label: "Max Saving on Dal" },
              { value: "Free", label: "Always Free" },
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

        {/* ── Key insight ── */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-orange-800 mb-1">💡 Key Insight</p>
          <p className="text-sm text-orange-700 leading-relaxed">
            The same 1kg toor dal can cost <strong>₹15–₹40 more</strong> on one platform vs another.
            Private label dal (BB Royal) is <strong>20–30% cheaper</strong> than branded options.
            Buying 5kg packs saves another 15–20% vs 1kg packs.
          </p>
        </div>

        {/* ── Dal varieties ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Dal Varieties — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {DAL_VARIETIES.map((b) => (
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
            5 Ways to Save on Dal in India
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
            Where to Buy Cheapest Dal Online
          </h2>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Dal Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Which app has the cheapest toor dal price in India?",
                a: "Toor dal prices vary across platforms and change frequently. JioMart and BigBasket typically have the lowest prices on 5kg packs. Use PriceBasket to compare current prices across all 8 apps in real-time.",
              },
              {
                q: "Is private label dal as good as branded?",
                a: "For everyday cooking, private label dal (BB Royal, JioMart brand) is comparable to branded options at 20–30% lower price. The quality difference is minimal for regular dal tadka and sambar.",
              },
              {
                q: "Which is the cheapest dal in India?",
                a: "Masoor dal (red lentils) is typically the cheapest dal, followed by moong dal. Toor dal and chana dal are mid-range. Urad dal is usually the most expensive. Prices vary by season — use PriceBasket to compare current prices.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-2">{faq.q}</h3>
                <p className="text-[13px] text-surface-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related pages ── */}
        <section className="mb-8">
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            Compare Other Grocery Staples
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Cheapest Atta Online",  href: "/cheapest-atta-online" },
              { label: "Cheapest Rice Online",  href: "/cheapest-rice-online" },
              { label: "Cheapest Oil Online",   href: "/cheapest-oil-online" },
              { label: "Best Grocery Deals",    href: "/best-grocery-deals" },
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
            Find Cheapest Dal Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=dal"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🫘 Compare Dal Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Dal Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
