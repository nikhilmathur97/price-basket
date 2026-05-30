import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Milk Online India 2026 — Blinkit vs Zepto vs BigBasket Milk Price | PriceBasket",
  description:
    "Compare milk prices across Blinkit, Zepto, BigBasket, JioMart, Instamart. Find cheapest Amul, Mother Dairy, Nandini milk online. 500ml, 1L milk price comparison. Free.",
  keywords: [
    "cheapest milk online india",
    "milk price comparison india",
    "amul milk price blinkit zepto",
    "cheapest milk blinkit",
    "zepto milk price",
    "bigbasket milk price",
    "amul gold milk price online",
    "mother dairy milk price online",
    "1 litre milk price comparison",
    "milk price today india",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-milk-online" },
  openGraph: {
    title: "Cheapest Milk Online India 2026 — Compare Blinkit, Zepto, BigBasket Milk Prices",
    description: "Find cheapest milk prices across 8 grocery apps. Amul, Mother Dairy, Nandini. Free comparison.",
    url: "https://pricebasket.in/cheapest-milk-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest milk price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Milk prices are regulated in India so branded milk (Amul, Mother Dairy) prices are similar across platforms. The difference is in delivery charges and platform discounts. PriceBasket compares all platforms in real-time to find the best effective price including any discounts.",
      },
    },
    {
      "@type": "Question",
      name: "Is Amul milk cheaper on Blinkit or Zepto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Amul milk MRP is fixed, but platforms offer different discounts and cashback. Zepto and Blinkit frequently run milk discounts. Use PriceBasket to compare current effective prices across all platforms.",
      },
    },
    {
      "@type": "Question",
      name: "Which milk is cheapest — Amul, Mother Dairy or private label?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Private label milk from BigBasket (BB Fresh) and Zepto is typically 10–15% cheaper than Amul or Mother Dairy. For branded milk, Amul Taaza is the most affordable option. Mother Dairy is competitive in Delhi NCR.",
      },
    },
  ],
};

const MILK_BRANDS = [
  { brand: "Amul Gold Milk",    sizes: ["500ml", "1L"], note: "Full cream — most popular" },
  { brand: "Amul Taaza Milk",   sizes: ["500ml", "1L"], note: "Toned milk — budget option" },
  { brand: "Mother Dairy Milk", sizes: ["500ml", "1L"], note: "Popular in Delhi NCR" },
  { brand: "Nandini Milk",      sizes: ["500ml", "1L"], note: "Popular in Karnataka" },
  { brand: "BB Fresh Milk",     sizes: ["500ml", "1L"], note: "BigBasket private label — cheaper" },
  { brand: "Zepto Fresh Milk",  sizes: ["500ml", "1L"], note: "Zepto private label — value" },
  { brand: "Heritage Milk",     sizes: ["500ml", "1L"], note: "Popular in South India" },
  { brand: "Parag Milk",        sizes: ["500ml", "1L"], note: "Premium option" },
];

const PLATFORMS = [
  { name: "Blinkit",          color: "#f8cb46", emoji: "⚡", verdict: "Good milk range. Frequent Amul milk discounts. 10-minute delivery — best for urgent milk needs. Competitive on 1L packs." },
  { name: "Zepto",            color: "#7c3aed", emoji: "🟣", verdict: "Zepto Fresh private label milk is 10–15% cheaper than Amul. Competitive discounts on branded milk. Fast delivery." },
  { name: "BigBasket",        color: "#84c225", emoji: "🟢", verdict: "BB Fresh private label milk is excellent value. Best for scheduled daily milk delivery. Subscription option available." },
  { name: "Swiggy Instamart", color: "#f97316", emoji: "🟠", verdict: "Good milk discounts for Swiggy One subscribers. Competitive on Amul and Mother Dairy. Fast delivery." },
  { name: "JioMart",          color: "#0a73ba", emoji: "🔵", verdict: "Competitive milk prices. Good for buying multiple litres at once. Expanding coverage." },
];

export default function CheapestMilkOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-blue-500 via-sky-600 to-cyan-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-3">
            🥛 Milk Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Milk Online India 2026
          </h1>
          <p className="text-blue-100 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare Amul, Mother Dairy, Nandini milk prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest milk price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=milk"
              className="bg-white text-blue-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-blue-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Milk Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Milk Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "15%",  label: "Max Saving on Milk" },
              { value: "Free", label: "Always Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-blue-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Key insight ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-blue-800 mb-1">💡 Key Insight</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            Amul and Mother Dairy milk MRP is fixed, but platforms offer different discounts.
            Private label milk (BB Fresh, Zepto Fresh) is <strong>10–15% cheaper</strong> than branded milk.
            Delivery charges also vary — PriceBasket shows the effective total price.
          </p>
        </div>

        {/* ── Milk brands ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular Milk Brands — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {MILK_BRANDS.map((b) => (
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

        {/* ── Platform comparison ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Where to Buy Cheapest Milk Online
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Milk Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Which app has the cheapest Amul milk price?",
                a: "Amul milk MRP is fixed, but Blinkit, Zepto and Instamart frequently offer discounts. Use PriceBasket to compare current effective prices including any platform discounts across all 8 apps.",
              },
              {
                q: "Is private label milk safe to drink?",
                a: "Yes, private label milk from BigBasket (BB Fresh) and Zepto is sourced from licensed dairies and meets FSSAI standards. It is a safe, cheaper alternative to branded milk for everyday use.",
              },
              {
                q: "Can I set a price alert for milk on PriceBasket?",
                a: "Yes! Set a price alert on PriceBasket for any milk product. When any platform drops below your target price, you get an email notification instantly. Free to use.",
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
            Find Cheapest Milk Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=milk"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🥛 Compare Milk Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Milk Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
