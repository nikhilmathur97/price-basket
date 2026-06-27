import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Rice Online India 2026 — Blinkit vs Zepto",
  description:
    "Compare rice prices across Blinkit, Zepto, BigBasket & JioMart. Find cheapest India Gate, Daawat, BB Royal basmati & sona masoori rice online. Free.",
  keywords: [
    "cheapest rice online india",
    "rice price comparison india",
    "basmati rice price blinkit zepto",
    "cheapest rice blinkit",
    "zepto rice price",
    "bigbasket rice price",
    "india gate basmati rice price online",
    "sona masoori rice price online",
    "5kg rice price comparison",
    "rice price today india",
    "ponni rice price online",
    "cheapest basmati rice india",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-rice-online" },
  openGraph: {
    title: "Cheapest Rice Online India 2026 — Compare Blinkit, Zepto, BigBasket Rice Prices",
    description: "Find cheapest rice prices across 8 grocery apps. India Gate, Daawat, BB Royal. Free comparison.",
    url: "https://pricebasket.in/cheapest-rice-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest rice price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rice prices vary across platforms. BigBasket's BB Royal and JioMart typically have the lowest prices on everyday rice. For premium basmati like India Gate, compare across all platforms on PriceBasket to find today's cheapest price. Buying 10kg packs saves 15–25% vs 1kg.",
      },
    },
    {
      "@type": "Question",
      name: "Is India Gate basmati rice cheaper on Blinkit or Zepto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "India Gate basmati rice prices differ between Blinkit and Zepto and change frequently. The same 5kg pack can cost ₹40–₹100 more on one platform vs another. Use PriceBasket to compare current prices across all 8 platforms in real-time.",
      },
    },
    {
      "@type": "Question",
      name: "What is the cheapest rice for everyday cooking in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For everyday cooking, private label rice from BigBasket (BB Royal) and JioMart's store brand offer the best value — 25–40% cheaper than India Gate or Daawat with good quality. Sona Masoori is popular in South India and is generally cheaper than basmati.",
      },
    },
  ],
};

const RICE_BRANDS = [
  { brand: "India Gate Basmati Rice",  sizes: ["1kg", "5kg", "10kg"], note: "Most popular basmati — premium quality" },
  { brand: "Daawat Basmati Rice",      sizes: ["1kg", "5kg", "10kg"], note: "Long grain, aromatic basmati" },
  { brand: "BB Royal Basmati Rice",    sizes: ["5kg", "10kg"],        note: "BigBasket private label — 30% cheaper" },
  { brand: "Fortune Sona Masoori",     sizes: ["1kg", "5kg", "10kg"], note: "Popular in South India" },
  { brand: "Kohinoor Basmati Rice",    sizes: ["1kg", "5kg", "10kg"], note: "Premium aged basmati" },
  { brand: "Zepto Rice",               sizes: ["5kg", "10kg"],        note: "Zepto private label — value pick" },
  { brand: "Patanjali Basmati Rice",   sizes: ["5kg", "10kg"],        note: "Budget-friendly option" },
  { brand: "JioMart Rice",             sizes: ["5kg", "10kg"],        note: "JioMart private label — bulk value" },
];

const SAVING_TIPS = [
  { tip: "Buy 10kg instead of 1kg",           saving: "Save 15–25% per kg" },
  { tip: "Choose private label over branded",  saving: "Save 25–40%" },
  { tip: "Compare all 8 apps before buying",   saving: "Save ₹40–₹120 per pack" },
  { tip: "Set a price alert on PriceBasket",   saving: "Catch flash sales" },
  { tip: "Buy Sona Masoori instead of Basmati",saving: "Save 20–35%" },
];

const PLATFORMS = [
  { name: "BigBasket",   color: "#84c225", emoji: "🟢", verdict: "Best for rice — BB Royal private label is 30% cheaper than India Gate. Huge range of varieties. Scheduled delivery. Best on 10kg packs." },
  { name: "JioMart",     color: "#0a73ba", emoji: "🔵", verdict: "Very competitive on bulk rice packs. Often cheapest on 10kg packs. Good for monthly stock-up. Strong on everyday rice varieties." },
  { name: "DMart Ready", color: "#008752", emoji: "🟩", verdict: "Everyday-low-price model works well for rice. Typically cheapest on bulk packs. Scheduled delivery." },
  { name: "Blinkit",     color: "#f8cb46", emoji: "⚡", verdict: "Good range of rice brands. Competitive on 1kg and 5kg packs. 10-minute delivery for urgent needs." },
  { name: "Zepto",       color: "#7c3aed", emoji: "🟣", verdict: "Competitive rice prices. Zepto private label rice is good value. Fast delivery. Frequent discounts on India Gate." },
];

export default function CheapestRiceOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-yellow-600 via-amber-700 to-orange-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-yellow-200 text-xs font-bold uppercase tracking-widest mb-3">
            🌾 Rice Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Rice Online India 2026
          </h1>
          <p className="text-yellow-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare India Gate, Daawat, BB Royal, Sona Masoori rice prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest rice price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=rice"
              className="bg-white text-amber-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-amber-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Rice Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Rice Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "40%",  label: "Max Saving on Rice" },
              { value: "Free", label: "Always Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-yellow-200 mt-0.5">{s.label}</p>
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
            The same 5kg India Gate basmati rice can cost <strong>₹40–₹100 more</strong> on one platform vs another.
            Private label rice (BB Royal, JioMart brand) is <strong>25–40% cheaper</strong> than India Gate
            with good everyday quality. Buying 10kg saves another 15–25%.
          </p>
        </div>

        {/* ── Rice brands ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Rice Brands — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {RICE_BRANDS.map((b) => (
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
            5 Ways to Save on Rice in India
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
            Where to Buy Cheapest Rice Online
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Rice Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Which app has the cheapest India Gate basmati rice price?",
                a: "India Gate basmati rice prices vary across platforms and change frequently. The same 5kg pack can cost ₹40–₹100 more on one platform vs another. Use PriceBasket to compare current prices across all 8 apps in real-time.",
              },
              {
                q: "Is private label rice as good as India Gate?",
                a: "For everyday cooking, private label rice (BB Royal, JioMart brand) is comparable to India Gate at 25–40% lower price. India Gate has a slight edge for special occasions due to its aged, extra-long grain basmati.",
              },
              {
                q: "Should I buy 5kg or 10kg rice?",
                a: "10kg rice packs are 15–25% cheaper per kg than 5kg packs. If you use rice regularly (most Indian households do), buying 10kg saves money. JioMart and BigBasket have the best 10kg rice prices.",
              },
              {
                q: "What is the difference between basmati and sona masoori rice?",
                a: "Basmati is long-grain, aromatic rice popular in North India for biryani and pulao. Sona Masoori is a medium-grain rice popular in South India for everyday cooking. Sona Masoori is generally 20–35% cheaper than basmati.",
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
              { label: "Cheapest Dal Online",   href: "/cheapest-dal-online" },
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
            Find Cheapest Rice Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=rice"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🌾 Compare Rice Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Rice Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
