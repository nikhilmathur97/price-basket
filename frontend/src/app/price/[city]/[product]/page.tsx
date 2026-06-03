import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CITIES,
  PRODUCTS,
  CITY_SLUGS,
  PRODUCT_SLUGS,
  getCityProductInsight,
} from "@/lib/city-product-data";
import { SITE_URL } from "@/lib/server-api";

interface PageProps {
  params: { city: string; product: string };
}

export function generateStaticParams() {
  const params: { city: string; product: string }[] = [];
  for (const city of CITY_SLUGS) {
    for (const product of PRODUCT_SLUGS) {
      params.push({ city, product });
    }
  }
  return params; // 40 combinations pre-rendered at build
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = CITIES[params.city];
  const product = PRODUCTS[params.product];
  if (!city || !product) return { title: "Not found" };

  const title = `${product.name} Price in ${city.name} 2026 — Compare Blinkit, Zepto, BigBasket`;
  const description = `Compare ${product.name.toLowerCase()} prices in ${city.name} across Blinkit, Zepto, BigBasket, JioMart and Swiggy Instamart. Live prices updated every 2 hours. Find cheapest ${product.name.toLowerCase()} in ${city.name} today.`;
  const url = `${SITE_URL}/price/${params.city}/${params.product}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    keywords: [
      `${product.name.toLowerCase()} price in ${city.name.toLowerCase()}`,
      `cheapest ${product.name.toLowerCase()} ${city.name.toLowerCase()}`,
      `${product.name.toLowerCase()} price ${city.name.toLowerCase()} today`,
      `blinkit ${product.name.toLowerCase()} price ${city.name.toLowerCase()}`,
      `zepto ${product.name.toLowerCase()} price ${city.name.toLowerCase()}`,
      `bigbasket ${product.name.toLowerCase()} ${city.name.toLowerCase()}`,
      ...product.searchAlias.map((a) => `${a} price ${city.name.toLowerCase()}`),
    ],
  };
}

export default function CityProductPage({ params }: PageProps) {
  const city = CITIES[params.city];
  const product = PRODUCTS[params.product];
  if (!city || !product) notFound();

  const insight = getCityProductInsight(params.city, params.product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (insight?.faq ?? []).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "PriceBasket", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: city.name, item: `${SITE_URL}/${city.cityPageSlug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${SITE_URL}/price/${params.city}/${params.product}` },
    ],
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* ── Hero ── */}
      <div
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${city.color}, ${city.colorEnd})` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <nav className="text-xs opacity-70 mb-4">
            <Link href="/" className="hover:opacity-100">PriceBasket</Link>
            {" › "}
            <Link href={`/${city.cityPageSlug}`} className="hover:opacity-100">{city.name}</Link>
            {" › "}
            <span>{product.name}</span>
          </nav>

          <div className="text-4xl mb-3">{product.emoji}</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            {product.name} Price in {city.name} 2026
          </h1>
          <p className="text-white/80 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            Compare {product.name.toLowerCase()} prices across Blinkit, Zepto, BigBasket,
            JioMart and Swiggy Instamart in {city.name}. Updated every 2 hours.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/search?q=${product.searchQuery}`}
              className="bg-white font-extrabold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-opacity shadow-lg text-sm"
              style={{ color: city.color }}
            >
              🔍 Compare {product.name} Prices in {city.name}
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set Price Alert
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-sm mx-auto">
            {[
              { value: "8",             label: "Apps Compared" },
              { value: insight?.savingAmount?.split("–")[0] ?? "₹30+", label: "Potential Saving" },
              { value: city.topApps[0], label: "Best App Today" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[11px] text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── City insight ── */}
        {insight && (
          <div className="bg-white rounded-2xl border border-surface-100 p-5">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
              📍 {city.name} — {product.name} Market Insight
            </p>
            <p className="text-sm text-surface-700 leading-relaxed">{insight.headline}</p>
            {insight.platformVerdict && (
              <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-green-700 mb-1">Platform verdict</p>
                <p className="text-sm text-green-800">{insight.platformVerdict}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Popular brands ── */}
        <section>
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Popular {product.name} Brands — Compare in {city.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {product.topBrands.map((b) => (
              <div key={b.brand} className="bg-white rounded-2xl border border-surface-100 p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-surface-900 text-sm">{b.brand}</p>
                  <p className="text-[11px] text-surface-500 mt-1">{b.note}</p>
                </div>
                <Link
                  href={`/search?q=${encodeURIComponent(b.brand.split(" ").slice(0, 2).join("+"))}`}
                  className="text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-100
                             px-3 py-1.5 rounded-xl whitespace-nowrap flex-shrink-0 hover:bg-brand-100 transition-colors"
                >
                  Compare →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platforms available in this city ── */}
        <section>
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Top Apps for {product.name} in {city.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {city.topApps.map((app, i) => (
              <div key={app} className="bg-white rounded-2xl border border-surface-100 p-4 flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0
                  ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-300" : i === 2 ? "bg-orange-400" : "bg-gray-200"}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-extrabold text-surface-900 text-sm">{app}</p>
                  <p className="text-[11px] text-surface-500">
                    {i === 0 ? `Often cheapest on ${product.name} in ${city.name}` : "Strong coverage in this city"}
                  </p>
                </div>
                <Link
                  href={`/search?q=${product.searchQuery}`}
                  className="text-[11px] font-bold text-brand-600 hover:underline"
                >
                  Check price →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Buy tip ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-amber-800 mb-1">💡 {city.name} buying tip for {product.name}</p>
          <p className="text-sm text-amber-700 leading-relaxed">{product.buyTip}</p>
        </div>

        {/* ── Neighbourhoods ── */}
        <section>
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            {product.name} Delivery Areas in {city.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {city.areas.map((area) => (
              <span key={area} className="text-sm font-semibold bg-white border border-surface-200 text-surface-700 px-3 py-1.5 rounded-full">
                📍 {area}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-surface-400 mt-2">
            All major platforms deliver {product.name} across {city.name} in 10 minutes to 2 hours.
          </p>
        </section>

        {/* ── FAQ ── */}
        {insight?.faq && insight.faq.length > 0 && (
          <section>
            <h2 className="text-xl font-extrabold text-surface-900 mb-4">
              {product.name} Price in {city.name} — FAQs
            </h2>
            <div className="space-y-3">
              {insight.faq.map((f) => (
                <div key={f.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                  <h3 className="font-bold text-surface-900 text-sm mb-2">{f.q}</h3>
                  <p className="text-[13px] text-surface-600 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Cross-links: other products in this city ── */}
        <section>
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            Other Grocery Prices in {city.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRODUCT_SLUGS.filter((p) => p !== params.product).map((p) => (
              <Link key={p} href={`/price/${params.city}/${p}`}
                className="bg-white rounded-xl border border-surface-100 p-3 text-sm font-semibold
                           text-brand-600 hover:border-brand-300 hover:shadow-sm transition-all text-center">
                {PRODUCTS[p].emoji} {PRODUCTS[p].name} →
              </Link>
            ))}
            <Link href={`/${city.cityPageSlug}`}
              className="bg-white rounded-xl border border-surface-100 p-3 text-sm font-semibold
                         text-brand-600 hover:border-brand-300 hover:shadow-sm transition-all text-center">
              📍 All {city.name} prices →
            </Link>
          </div>
        </section>

        {/* ── Cross-links: same product other cities ── */}
        <section>
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            {product.name} Price in Other Cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {CITY_SLUGS.filter((c) => c !== params.city).map((c) => (
              <Link key={c} href={`/price/${c}/${params.product}`}
                className="text-sm font-semibold bg-white border border-surface-200 text-brand-600
                           hover:border-brand-300 px-4 py-2 rounded-xl transition-colors">
                {CITIES[c].emoji} {CITIES[c].name} →
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">
            Find Cheapest {product.name} in {city.name} Now
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare 8 platforms in 2 seconds. Free. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/search?q=${product.searchQuery}`}
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              {product.emoji} Compare {product.name} Prices
            </Link>
            <Link href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3 rounded-2xl hover:bg-white/30 transition-colors text-sm">
              🔔 Set Price Alert
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
