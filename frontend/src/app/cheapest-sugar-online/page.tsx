import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Sugar Online India 2026 — Blinkit vs Zepto",
  description:
    "Compare sugar prices across Blinkit, Zepto, BigBasket & JioMart. Find cheapest refined, raw and brown sugar online in India. 1kg, 5kg price comparison. Free.",
  keywords: [
    "cheapest sugar online india",
    "sugar price comparison india",
    "sugar price blinkit zepto",
    "cheapest sugar blinkit",
    "zepto sugar price",
    "bigbasket sugar price",
    "5kg sugar price comparison",
    "sugar price today india",
    "refined sugar price online",
    "brown sugar price online",
    "cheapest sugar india 2025",
    "sugar 1kg price online",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-sugar-online" },
  openGraph: {
    title: "Cheapest Sugar Online India 2026 — Compare Blinkit, Zepto, BigBasket Sugar Prices",
    description: "Find cheapest sugar prices across 8 grocery apps. Refined, raw, brown sugar. Free comparison.",
    url: "https://pricebasket.in/cheapest-sugar-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest sugar price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sugar prices are regulated in India so the difference between platforms is smaller than other groceries — typically ₹5–₹20 per kg. JioMart and DMart Ready usually have the lowest sugar prices. Buying 5kg packs saves 10–15% vs 1kg. Use PriceBasket to compare current prices across all 8 platforms.",
      },
    },
    {
      "@type": "Question",
      name: "Is sugar cheaper on Blinkit or BigBasket?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BigBasket and JioMart typically offer lower sugar prices than Blinkit for bulk packs. Blinkit is convenient for urgent needs but may charge a slight premium. The price difference on 5kg sugar can be ₹15–₹40 between platforms. Compare on PriceBasket before buying.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between refined sugar and raw sugar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Refined white sugar (sulphurless/double-refined) is the most common type used in Indian households. Raw sugar (khandsari) is less processed and slightly cheaper. Brown sugar and jaggery powder are healthier alternatives but cost 2–3x more. For everyday use, refined sulphurless sugar is the best value.",
      },
    },
  ],
};

const SUGAR_BRANDS = [
  { brand: "Uttam Sugar",          sizes: ["1kg", "5kg"],       note: "Most popular refined sugar brand in India" },
  { brand: "Rajshree Sugar",       sizes: ["1kg", "5kg"],       note: "Sulphurless refined sugar — widely available" },
  { brand: "BB Royal Sugar",       sizes: ["1kg", "5kg"],       note: "BigBasket private label — good value" },
  { brand: "Madhur Sugar",         sizes: ["1kg", "5kg"],       note: "Double-refined, pure white sugar" },
  { brand: "Patanjali Sugar",      sizes: ["1kg", "5kg"],       note: "Budget-friendly, widely trusted" },
  { brand: "Organic India Sugar",  sizes: ["500g", "1kg"],      note: "Organic raw cane sugar — premium" },
  { brand: "Zepto Sugar",          sizes: ["1kg", "5kg"],       note: "Zepto private label — value pick" },
  { brand: "JioMart Sugar",        sizes: ["1kg", "5kg"],       note: "JioMart private label — bulk value" },
];

const SAVING_TIPS = [
  { tip: "Buy 5kg instead of 1kg",              saving: "Save 10–15% per kg" },
  { tip: "Choose private label over branded",   saving: "Save 8–15%" },
  { tip: "Compare all 8 apps before buying",    saving: "Save ₹15–₹40 per 5kg" },
  { tip: "Set a price alert on PriceBasket",    saving: "Catch flash sales" },
  { tip: "Buy sulphurless refined for quality", saving: "Best value for money" },
];

const PLATFORMS = [
  { name: "JioMart",     color: "#0a73ba", emoji: "🔵", verdict: "Best for sugar — consistently lowest prices on 5kg packs. JioMart private label sugar is excellent value. Strong on bulk staples." },
  { name: "DMart Ready", color: "#008752", emoji: "🟩", verdict: "Everyday-low-price model works very well for sugar. Typically cheapest or tied for cheapest. Scheduled delivery." },
  { name: "BigBasket",   color: "#84c225", emoji: "🟢", verdict: "Good range of sugar brands. BB Royal private label is 10–15% cheaper than branded. Reliable quality and delivery." },
  { name: "Blinkit",     color: "#f8cb46", emoji: "⚡", verdict: "Convenient for urgent needs. Slightly higher prices than JioMart/DMart on sugar but fast 10-minute delivery." },
  { name: "Zepto",       color: "#7c3aed", emoji: "🟣", verdict: "Competitive sugar prices. Zepto private label is good value. Frequent discounts. Fast delivery." },
];

export default function CheapestSugarOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-red-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-pink-200 text-xs font-bold uppercase tracking-widest mb-3">
            🍬 Sugar Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Sugar Online India 2026
          </h1>
          <p className="text-pink-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Uttam, Rajshree, Madhur, BB Royal sugar prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest sugar price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=sugar"
              className="bg-white text-rose-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-rose-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Sugar Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Sugar Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "15%",  label: "Max Saving on Sugar" },
              { value: "Free", label: "Always Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-pink-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Key insight ── */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-rose-800 mb-1">💡 Key Insight</p>
          <p className="text-sm text-rose-700 leading-relaxed">
            Sugar prices are government-regulated in India, so differences between platforms are smaller
            than other groceries — typically <strong>₹5–₹40 per 5kg pack</strong>. JioMart and DMart Ready
            consistently offer the lowest prices. Buying 5kg saves <strong>10–15% vs 1kg</strong>.
          </p>
        </div>

        {/* ── Sugar brands ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Sugar Brands — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {SUGAR_BRANDS.map((b) => (
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
            5 Ways to Save on Sugar in India
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
            Where to Buy Cheapest Sugar Online
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Sugar Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Why is sugar price almost the same everywhere?",
                a: "Sugar is an essential commodity in India and its price is regulated by the government. The Fair and Remunerative Price (FRP) sets a floor price for sugarcane, which limits how much prices can vary. However, platforms still differ by ₹5–₹40 per 5kg due to their own margins and promotions.",
              },
              {
                q: "Is sulphurless sugar better than regular sugar?",
                a: "Yes. Sulphurless (double-refined) sugar is processed without sulphur dioxide, making it purer and safer. Most branded sugar sold online (Uttam, Rajshree, Madhur) is sulphurless. It costs slightly more than raw/khandsari sugar but is the recommended choice for daily use.",
              },
              {
                q: "Should I buy 1kg or 5kg sugar?",
                a: "5kg sugar packs are 10–15% cheaper per kg than 1kg packs. Since sugar has a long shelf life (2+ years if stored dry), buying 5kg is almost always the better value. JioMart and BigBasket have the best 5kg sugar prices.",
              },
              {
                q: "Is brown sugar healthier than white sugar?",
                a: "Brown sugar has marginally more minerals than white sugar but the difference is negligible. Both have the same calorie content. Brown sugar costs 2–3x more than refined white sugar. For health benefits, jaggery (gur) or coconut sugar are better alternatives.",
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
              { label: "Cheapest Dal Online",   href: "/cheapest-dal-online" },
              { label: "Cheapest Ghee Online",  href: "/cheapest-ghee-online" },
              { label: "Cheapest Oil Online",   href: "/cheapest-oil-online" },
              { label: "Best Grocery Deals",    href: "/best-grocery-deals" },
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
            Find Cheapest Sugar Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=sugar"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🍬 Compare Sugar Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Sugar Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
