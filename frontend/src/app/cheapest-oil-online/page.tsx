import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Cooking Oil Online India 2026 — Blinkit vs Zepto vs BigBasket Oil Price | PriceBasket",
  description:
    "Compare cooking oil prices across Blinkit, Zepto, BigBasket, JioMart, Instamart. Find cheapest sunflower oil, mustard oil online. 1L, 5L oil price comparison. Free.",
  keywords: [
    "cheapest cooking oil online india",
    "oil price comparison india",
    "sunflower oil price blinkit zepto",
    "cheapest oil blinkit",
    "zepto oil price",
    "bigbasket oil price",
    "fortune sunflower oil price online",
    "saffola oil price online",
    "5 litre oil price comparison",
    "cooking oil price today india",
    "mustard oil price comparison",
    "refined oil cheapest india",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-oil-online" },
  openGraph: {
    title: "Cheapest Cooking Oil Online India 2026 — Compare Blinkit, Zepto, BigBasket Oil Prices",
    description: "Find cheapest cooking oil prices across 8 grocery apps. Fortune, Saffola, Dhara. Free comparison.",
    url: "https://pricebasket.in/cheapest-oil-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest cooking oil price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cooking oil prices vary significantly across platforms. JioMart and BigBasket typically have the lowest prices on 5L oil packs. Blinkit and Zepto are competitive on 1L packs. PriceBasket compares all 8 platforms in real-time so you always find the cheapest oil price.",
      },
    },
    {
      "@type": "Question",
      name: "Is Fortune sunflower oil cheaper on Blinkit or Zepto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fortune oil prices differ between Blinkit and Zepto and change frequently. The same 1L Fortune sunflower oil can cost Rs 10-25 more on one platform vs another. Use PriceBasket to compare current prices across all platforms.",
      },
    },
    {
      "@type": "Question",
      name: "Should I buy 1L or 5L cooking oil?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "5L oil packs are 15-25% cheaper per litre than 1L packs. For a family that uses oil regularly, buying 5L from JioMart or BigBasket saves Rs 50-150 per purchase. PriceBasket compares all pack sizes across all platforms.",
      },
    },
  ],
};

const OIL_BRANDS = [
  { brand: "Fortune Sunflower Oil", sizes: ["1L", "2L", "5L"], note: "Most popular sunflower oil" },
  { brand: "Saffola Gold Oil",      sizes: ["1L", "2L", "5L"], note: "Heart-healthy blend" },
  { brand: "Dhara Refined Oil",     sizes: ["1L", "2L", "5L"], note: "Budget-friendly option" },
  { brand: "Patanjali Mustard Oil", sizes: ["1L", "2L", "5L"], note: "Popular in North India" },
  { brand: "Engine Mustard Oil",    sizes: ["1L", "2L", "5L"], note: "Strong mustard flavour" },
  { brand: "BB Royal Refined Oil",  sizes: ["1L", "5L"],       note: "BigBasket private label — 20% cheaper" },
  { brand: "Sundrop Sunflower Oil", sizes: ["1L", "2L", "5L"], note: "Light and healthy" },
  { brand: "Gemini Sunflower Oil",  sizes: ["1L", "5L"],       note: "Value pick" },
];

const PLATFORMS = [
  { name: "BigBasket",        color: "#84c225", emoji: "🟢", verdict: "Best for bulk oil — BB Royal private label is 20% cheaper than Fortune. Best prices on 5L packs. Scheduled delivery." },
  { name: "JioMart",          color: "#0a73ba", emoji: "🔵", verdict: "Very competitive on 5L oil packs. Often cheapest for bulk oil purchases. Good for monthly stock-up." },
  { name: "DMart Ready",      color: "#008752", emoji: "🟩", verdict: "Everyday-low-price model works well for oil. Typically cheapest on bulk packs. Scheduled delivery." },
  { name: "Blinkit",          color: "#f8cb46", emoji: "⚡", verdict: "Good range of oil brands. Competitive on 1L packs. 10-minute delivery for urgent needs." },
  { name: "Zepto",            color: "#7c3aed", emoji: "🟣", verdict: "Competitive oil prices. Frequent discounts on Fortune and Saffola. Fast delivery." },
];

const SAVING_TIPS = [
  { tip: "Buy 5L instead of 1L",              saving: "Save 15–25% per litre" },
  { tip: "Choose private label (BB Royal)",    saving: "Save 20–30%" },
  { tip: "Compare all 8 apps before buying",   saving: "Save ₹20–₹80 per bottle" },
  { tip: "Set a price alert on PriceBasket",   saving: "Catch flash sales" },
  { tip: "Buy from JioMart or DMart for bulk", saving: "Lowest bulk prices" },
];

const FAQS = [
  {
    q: "Which app has the cheapest Fortune sunflower oil price?",
    a: "Fortune oil prices vary across platforms and change frequently. The same 1L Fortune oil can cost ₹15–₹40 more on one platform vs another. Use PriceBasket to compare current prices across all 8 apps in real-time.",
  },
  {
    q: "Is 5L oil cheaper than buying 1L five times?",
    a: "Yes, 5L oil packs are 15–25% cheaper per litre than 1L packs. JioMart and BigBasket have the best prices on 5L oil packs. PriceBasket compares all pack sizes across all platforms.",
  },
  {
    q: "Which is better — sunflower oil or mustard oil for cooking?",
    a: "Both are healthy options. Sunflower oil (Fortune, Saffola) is lighter and good for frying. Mustard oil (Patanjali, Engine) is traditional in North and East India with a stronger flavour. Price-wise, sunflower oil is generally cheaper per litre.",
  },
  {
    q: "Can I set a price alert for cooking oil on PriceBasket?",
    a: "Yes! Set a price alert on PriceBasket for any oil product. When any platform drops below your target price, you get an email notification instantly. Free to use.",
  },
];

export default function CheapestOilOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-yellow-200 text-xs font-bold uppercase tracking-widest mb-3">
            🫙 Cooking Oil Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Cooking Oil Online India 2026
          </h1>
          <p className="text-yellow-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Fortune, Saffola, Dhara, Patanjali oil prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest oil price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=oil"
              className="bg-white text-amber-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-amber-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Oil Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Oil Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "30%",  label: "Max Saving on Oil" },
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
            The same 1L Fortune sunflower oil can cost <strong>₹15–₹40 more</strong> on one platform vs another.
            Buying 5L packs saves <strong>15–25% per litre</strong> vs 1L packs.
            Private label oil (BB Royal) is <strong>20% cheaper</strong> than Fortune with similar quality.
          </p>
        </div>

        {/* ── Oil brands ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Cooking Oil Brands — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {OIL_BRANDS.map((b) => (
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
            5 Ways to Save on Cooking Oil in India
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
            Where to Buy Cheapest Cooking Oil Online
          </h2>
          <div className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl border border-surface-100 p-4 flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: p.color + "22", border: `2px solid ${p.color}44` }}
                >
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Cooking Oil Price FAQs</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
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
              { label: "Cheapest Milk Online",  href: "/cheapest-milk-online" },
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
            Find Cheapest Oil Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=oil"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🫙 Compare Oil Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Oil Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
