import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheapest Eggs Online India 2026 — Blinkit vs Zepto vs BigBasket Egg Price | PriceBasket",
  description:
    "Compare egg prices across Blinkit, Zepto, BigBasket, JioMart, Instamart. Find cheapest white eggs, brown eggs, desi eggs online. 6, 12, 30 egg tray price comparison. Free.",
  keywords: [
    "cheapest eggs online india",
    "egg price comparison india",
    "egg price blinkit zepto",
    "cheapest eggs blinkit",
    "zepto egg price",
    "bigbasket egg price",
    "12 eggs price comparison",
    "egg price today india",
    "brown eggs price online",
    "desi eggs price online",
    "cheapest eggs india 2025",
    "egg tray price online",
  ],
  alternates: { canonical: "https://pricebasket.in/cheapest-eggs-online" },
  openGraph: {
    title: "Cheapest Eggs Online India 2026 — Compare Blinkit, Zepto, BigBasket Egg Prices",
    description: "Find cheapest egg prices across 8 grocery apps. White, brown, desi, organic eggs. Free comparison.",
    url: "https://pricebasket.in/cheapest-eggs-online",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which app has the cheapest egg price in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Egg prices vary across platforms and change frequently based on supply. Blinkit, Zepto, and BigBasket are typically competitive on eggs. The price difference on a tray of 30 eggs can be ₹20–₹60 between platforms. Use PriceBasket to compare current egg prices across all 8 platforms in real-time.",
      },
    },
    {
      "@type": "Question",
      name: "Are brown eggs healthier than white eggs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Brown and white eggs have identical nutritional value. The colour difference is due to the breed of hen, not the diet or quality. Brown eggs typically cost 10–20% more than white eggs. Desi (country) eggs are smaller but have a richer yolk and are considered more nutritious by many.",
      },
    },
    {
      "@type": "Question",
      name: "Should I buy 6, 12, or 30 eggs online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Buying a tray of 30 eggs is 15–25% cheaper per egg than buying 6 or 12. Since eggs last 3–5 weeks in the refrigerator, buying 30 at a time is excellent value for regular egg consumers. BigBasket and JioMart have the best prices on 30-egg trays.",
      },
    },
  ],
};

const EGG_TYPES = [
  { brand: "White Eggs (6 pack)",       sizes: ["6"],          note: "Most affordable — everyday use" },
  { brand: "White Eggs (12 pack)",      sizes: ["12"],         note: "Best seller — 10% cheaper per egg vs 6" },
  { brand: "White Eggs (30 tray)",      sizes: ["30"],         note: "Best value — 20–25% cheaper per egg" },
  { brand: "Brown Eggs (6 pack)",       sizes: ["6", "12"],    note: "10–20% pricier than white — same nutrition" },
  { brand: "Desi / Country Eggs",       sizes: ["6", "12"],    note: "Smaller, richer yolk — premium segment" },
  { brand: "Organic Eggs",              sizes: ["6", "12"],    note: "Free-range, organic feed — 2–3x price" },
  { brand: "Omega-3 Enriched Eggs",     sizes: ["6", "12"],    note: "Fortified eggs — health-conscious pick" },
  { brand: "BB Fresh Eggs",             sizes: ["6", "12", "30"], note: "BigBasket sourced — fresh, competitive price" },
];

const SAVING_TIPS = [
  { tip: "Buy 30-egg tray instead of 12",         saving: "Save 20–25% per egg" },
  { tip: "Choose white eggs over brown",           saving: "Save 10–20%" },
  { tip: "Compare all 8 apps before buying",       saving: "Save ₹20–₹60 per tray" },
  { tip: "Set a price alert on PriceBasket",       saving: "Catch flash sales" },
  { tip: "Buy from BigBasket or JioMart for bulk", saving: "Best bulk egg prices" },
];

const PLATFORMS = [
  { name: "BigBasket",   color: "#84c225", emoji: "🟢", verdict: "Best for eggs — BB Fresh eggs are competitively priced and reliably fresh. Best prices on 30-egg trays. Wide variety including desi and organic." },
  { name: "Blinkit",     color: "#f8cb46", emoji: "⚡", verdict: "Very competitive egg prices. Great for 6 and 12 packs. 10-minute delivery makes it ideal for urgent needs. Frequent discounts." },
  { name: "Zepto",       color: "#7c3aed", emoji: "🟣", verdict: "Competitive egg prices. Good range of egg types. Fast delivery. Regular promotions on egg packs." },
  { name: "JioMart",     color: "#0a73ba", emoji: "🔵", verdict: "Good prices on bulk egg trays. Competitive on 30-egg packs. Reliable for monthly grocery stock-up." },
  { name: "Swiggy Instamart", color: "#fc8019", emoji: "🟠", verdict: "Convenient for quick egg delivery. Prices slightly higher than BigBasket but fast. Good for small packs." },
];

export default function CheapestEggsOnlinePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-3">
            🥚 Egg Price Comparison India
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            Cheapest Eggs Online India 2026
          </h1>
          <p className="text-orange-50 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare white, brown, desi and organic egg prices across Blinkit, Zepto,
            BigBasket, JioMart and 4 more apps. Find the cheapest egg price in seconds. Free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search?q=eggs"
              className="bg-white text-orange-700 font-extrabold px-8 py-3.5 rounded-2xl
                         hover:bg-orange-50 transition-colors shadow-lg text-sm"
            >
              🔍 Compare Egg Prices Now
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Egg Price Alert
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
            {[
              { value: "8",    label: "Apps Compared" },
              { value: "25%",  label: "Max Saving on Eggs" },
              { value: "Free", label: "Always Free" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-orange-100 mt-0.5">{s.label}</p>
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
            A tray of 30 eggs can cost <strong>₹20–₹60 more</strong> on one platform vs another.
            Buying a 30-egg tray is <strong>20–25% cheaper per egg</strong> than buying 6 at a time.
            White eggs have identical nutrition to brown eggs but cost <strong>10–20% less</strong>.
          </p>
        </div>

        {/* ── Egg types ── */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Egg Types & Pack Sizes — Compare Prices
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {EGG_TYPES.map((b) => (
              <div key={b.brand} className="bg-white rounded-2xl border border-surface-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-surface-900 text-sm">{b.brand}</p>
                    <p className="text-[11px] text-surface-500 mt-0.5">{b.note}</p>
                    <div className="flex gap-1 mt-2">
                      {b.sizes.map((s) => (
                        <span key={s} className="text-[10px] font-bold bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full">
                          {s} eggs
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/search?q=${encodeURIComponent(b.brand.split(" (")[0])}`}
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
            5 Ways to Save on Eggs in India
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
            Where to Buy Cheapest Eggs Online
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
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">Egg Price FAQs</h2>
          <div className="space-y-3">
            {[
              {
                q: "Why do egg prices change so frequently?",
                a: "Egg prices in India are highly volatile and change based on seasonal demand, feed costs, and supply chain factors. Prices typically rise in winter (Oct–Feb) due to higher demand and fall in summer. Platforms adjust prices frequently — sometimes daily. Use PriceBasket to track current prices.",
              },
              {
                q: "Are desi eggs better than farm eggs?",
                a: "Desi (country) eggs come from free-range hens and are smaller with a richer, more flavourful yolk. Farm eggs (white/brown) are from commercial poultry and are larger and more uniform. Nutritionally, desi eggs have slightly more omega-3 and vitamins. They cost 30–50% more than regular eggs.",
              },
              {
                q: "How long do eggs last after delivery?",
                a: "Eggs delivered from online platforms are typically 3–7 days old. Stored in the refrigerator, they last 3–5 weeks from the lay date. Always check the best-before date on delivery. BigBasket and Blinkit have good freshness standards for eggs.",
              },
              {
                q: "Is it safe to buy eggs online in India?",
                a: "Yes, buying eggs online from reputable platforms (BigBasket, Blinkit, Zepto, JioMart) is safe. They maintain cold chain logistics and proper packaging to prevent breakage. BigBasket's BB Fresh eggs are sourced from certified farms. Always check the packaging on delivery.",
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
              { label: "Cheapest Milk Online",  href: "/cheapest-milk-online" },
              { label: "Cheapest Ghee Online",  href: "/cheapest-ghee-online" },
              { label: "Cheapest Atta Online",  href: "/cheapest-atta-online" },
              { label: "Cheapest Rice Online",  href: "/cheapest-rice-online" },
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
            Find Cheapest Egg Price Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free forever. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search?q=eggs"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🥚 Compare Egg Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Egg Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
