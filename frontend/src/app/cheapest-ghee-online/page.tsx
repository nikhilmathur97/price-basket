import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Ghee Online India 2026 — Blinkit vs Zepto",
  description:
    "Compare ghee prices across Blinkit, Zepto, BigBasket & JioMart. Find cheapest Amul, Patanjali, Mother Dairy ghee online. 500ml, 1L price comparison. Free.",
  keywords: [
    "cheapest ghee online india",
    "ghee price comparison india",
    "amul ghee price blinkit zepto",
    "cheapest ghee blinkit",
    "zepto ghee price",
    "bigbasket ghee price",
    "amul ghee 1kg price online",
    "patanjali ghee price online",
    "500ml ghee price comparison",
    "ghee price today india",
    "mother dairy ghee price online",
    "cheapest desi ghee india",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-ghee-online" },
  openGraph: {
    title: "Cheapest Ghee Online India 2026 — Compare Blinkit, Zepto, BigBasket Ghee Prices",
    description: "Find cheapest ghee prices across 8 grocery apps. Amul, Patanjali, Mother Dairy. Free comparison.",
    url: "https://pricebasket.in/cheapest-ghee-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest Amul ghee price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Amul ghee prices vary significantly across platforms — the same 1L tin can cost ₹50–₹120 more on one platform vs another. BigBasket, JioMart, and DMart Ready typically have the lowest Amul ghee prices. Use PriceBasket to compare current prices across all 8 platforms in real-time before buying.",
      },
    },
    {
      "@type": "Question",
      name: "Is Patanjali ghee cheaper than Amul ghee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Patanjali ghee is typically 15–25% cheaper than Amul ghee. Patanjali cow ghee is a popular budget alternative. However, Amul ghee has a longer shelf life and is more widely available. For the best value, compare both brands on PriceBasket across all platforms.",
      },
    },
    {
      "@type": "Question",
      name: "Should I buy 500ml or 1L ghee online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "1L ghee is 10–20% cheaper per ml than 500ml. Since ghee has a long shelf life (12–18 months), buying 1L is almost always better value. For heavy users, 2L tins offer even better savings. JioMart and BigBasket have the best prices on 1L and larger ghee packs.",
      },
    },
  ],
};

const GHEE_BRANDS = [
  { brand: "Amul Pure Ghee",          sizes: ["200ml", "500ml", "1L", "2L"], note: "Most popular — trusted quality, widely available" },
  { brand: "Patanjali Cow Ghee",       sizes: ["500ml", "1L"],               note: "Budget-friendly, 15–25% cheaper than Amul" },
  { brand: "Mother Dairy Ghee",        sizes: ["500ml", "1L"],               note: "Good quality, competitive pricing" },
  { brand: "Gowardhan Ghee",           sizes: ["500ml", "1L", "2L"],         note: "Premium cow ghee — rich flavour" },
  { brand: "BB Royal Ghee",            sizes: ["500ml", "1L"],               note: "BigBasket private label — 20% cheaper" },
  { brand: "Aashirvaad Svasti Ghee",   sizes: ["500ml", "1L"],               note: "ITC brand — premium quality" },
  { brand: "Milkio Grass-Fed Ghee",    sizes: ["500ml"],                     note: "Premium grass-fed — health-conscious pick" },
  { brand: "Organic India Ghee",       sizes: ["250ml", "500ml"],            note: "Organic certified — premium segment" },
];

const SAVING_TIPS = [
  { tip: "Buy 1L instead of 500ml",              saving: "Save 10–20% per ml" },
  { tip: "Choose Patanjali over Amul",            saving: "Save 15–25%" },
  { tip: "Compare all 8 apps before buying",      saving: "Save ₹50–₹120 per 1L" },
  { tip: "Set a price alert on PriceBasket",      saving: "Catch flash sales" },
  { tip: "Buy BB Royal or store brand ghee",      saving: "Save 20–30% vs Amul" },
];

const PLATFORMS = [
  { name: "BigBasket",   color: "#84c225", emoji: "🟢", verdict: "Best for ghee — BB Royal private label is 20% cheaper than Amul. Huge range including premium and organic options. Best on 1L+ packs." },
  { name: "JioMart",     color: "#0a73ba", emoji: "🔵", verdict: "Very competitive on Amul and Patanjali ghee. Often cheapest on 1L packs. Good for monthly stock-up. Strong on bulk staples." },
  { name: "DMart Ready", color: "#008752", emoji: "🟩", verdict: "Everyday-low-price model works well for ghee. Typically cheapest or tied for cheapest on Amul 1L. Scheduled delivery." },
  { name: "Blinkit",     color: "#f8cb46", emoji: "⚡", verdict: "Good range of ghee brands. Competitive on 500ml packs. 10-minute delivery for urgent needs. Slightly higher prices on bulk." },
  { name: "Zepto",       color: "#7c3aed", emoji: "🟣", verdict: "Competitive ghee prices. Frequent discounts on Amul and Patanjali. Fast delivery. Good for 500ml packs." },
];

export default function CheapestGheeOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-yellow-100 text-xs font-bold uppercase tracking-widest mb-3">
            🫙 Ghee Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Ghee Online India 2026
          </h1>
          <p className="text-yellow-50 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Amul, Patanjali, Mother Dairy, Gowardhan ghee prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest ghee price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=ghee"
              className="bg-white text-amber-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-amber-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Ghee Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Ghee Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "30%",  label: "Max Saving on Ghee" },
              { value: "Free", label: "Always Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-yellow-100 mt-0.5">{s.label}</p>
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
            The same Amul 1L ghee tin can cost <strong>₹50–₹120 more</strong> on one platform vs another.
            Patanjali cow ghee is <strong>15–25% cheaper</strong> than Amul with comparable quality.
            Buying 1L saves another 10–20% vs 500ml.
          </p>
        </div>

        {/* ── Ghee brands ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Ghee Brands — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {GHEE_BRANDS.map((b) => (
              <div key={b.brand} className="bg-white rounded-2xl border border-surface-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-surface-900 text-sm">{b.brand}</p>
                    <p className="text-[11px] text-surface-500 mt-0.5">{b.note}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
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
            5 Ways to Save on Ghee in India
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
            Where to Buy Cheapest Ghee Online
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Ghee Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Which is the best ghee brand in India for value?",
                a: "For best value, Patanjali cow ghee offers 15–25% savings over Amul with good quality. BB Royal (BigBasket private label) is another excellent value option at 20% cheaper than Amul. For premium quality, Gowardhan and Aashirvaad Svasti are worth the extra cost.",
              },
              {
                q: "Is desi ghee the same as regular ghee?",
                a: "Desi ghee refers to ghee made from cow's milk using the traditional bilona (churning) method. It is considered superior in taste and nutrition. Most branded ghee (Amul, Patanjali) is made from cream/butter, not the traditional method. True desi ghee costs 2–4x more.",
              },
              {
                q: "How long does ghee last after opening?",
                a: "Ghee has a very long shelf life — 12–18 months unopened, and 3–6 months after opening if stored in a cool, dry place away from direct sunlight. No refrigeration needed. This makes buying 1L or 2L packs excellent value.",
              },
              {
                q: "Is Amul ghee price the same on Blinkit and Zepto?",
                a: "No. Amul ghee prices differ between Blinkit and Zepto and change frequently. The same 1L tin can cost ₹50–₹120 more on one platform vs another. Always compare on PriceBasket before buying to find the current cheapest price.",
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
              { label: "Cheapest Oil Online",   href: "/cheapest-oil-online" },
              { label: "Cheapest Milk Online",  href: "/cheapest-milk-online" },
              { label: "Cheapest Atta Online",  href: "/cheapest-atta-online" },
              { label: "Cheapest Sugar Online", href: "/cheapest-sugar-online" },
              { label: "Blinkit vs Zepto",      href: "/compare/blinkit-vs-zepto" },
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
            Find Cheapest Ghee Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=ghee"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🫙 Compare Ghee Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Ghee Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
