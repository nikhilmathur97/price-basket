import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DEAL_PLATFORMS,
  DEAL_PLATFORM_SLUGS,
  getDealPlatform,
} from "@/lib/deals-data";
import { SITE_URL } from "@/lib/server-api";

interface PageProps {
  params: { platform: string };
}

export function generateStaticParams() {
  return DEAL_PLATFORM_SLUGS.map((platform) => ({ platform }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = getDealPlatform(params.platform);
  if (!p) return { title: "Not found" };

  const title = `${p.name} Offers Today 2026 — Latest Deals, Discounts & Sale | PriceBasket`;
  const description = `Find the best ${p.name} offers and deals today. Compare ${p.name} prices with Blinkit, Zepto, BigBasket and JioMart in real-time to confirm you're getting the cheapest price. Updated continuously.`;
  const url = `${SITE_URL}/deals/${params.platform}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    keywords: [
      `${p.name.toLowerCase()} offers today`,
      `${p.name.toLowerCase()} deals today`,
      `${p.name.toLowerCase()} discount today`,
      `${p.name.toLowerCase()} sale today`,
      `${p.name.toLowerCase()} coupon code`,
      `best ${p.name.toLowerCase()} offers india`,
      `${p.name.toLowerCase()} grocery deals`,
    ],
  };
}

export default function DealsPlatformPage({ params }: PageProps) {
  const p = getDealPlatform(params.platform);
  if (!p) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faq.map((f) => ({
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
      { "@type": "ListItem", position: 2, name: "Deals", item: `${SITE_URL}/best-grocery-deals` },
      { "@type": "ListItem", position: 3, name: `${p.name} Offers`, item: `${SITE_URL}/deals/${params.platform}` },
    ],
  };

  const otherPlatforms = DEAL_PLATFORM_SLUGS.filter((s) => s !== params.platform);

  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* ── Hero ── */}
      <div
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${p.color}, ${p.colorEnd})` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <nav className="text-xs opacity-70 mb-4">
            <Link href="/" className="hover:opacity-100">PriceBasket</Link>
            {" › "}
            <Link href="/best-grocery-deals" className="hover:opacity-100">Deals</Link>
            {" › "}
            <span>{p.name} Offers</span>
          </nav>

          <div className="text-4xl mb-3">{p.emoji}</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            {p.name} Offers Today — Latest Deals &amp; Discounts 2026
          </h1>
          <p className="text-white/85 text-base sm:text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            {p.blurb}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/search"
              className="bg-white font-extrabold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-opacity shadow-lg text-sm"
              style={{ color: p.color }}
            >
              🔍 Compare {p.name} Prices Live
            </Link>
            <Link
              href="/alerts"
              className="bg-white/20 border border-white/40 text-white font-extrabold
                         px-8 py-3.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
            >
              🔔 Set a Price Alert
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-sm mx-auto">
            {[
              { value: "8", label: "Apps Compared" },
              { value: p.savingRange.split("/")[0], label: "Potential Saving" },
              { value: "Live", label: "Price Updates" },
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

        {/* ── Reality-check banner ── */}
        <div className="bg-white rounded-2xl border border-surface-100 p-5">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
            💡 Before you grab a {p.name} deal
          </p>
          <p className="text-sm text-surface-700 leading-relaxed">
            A platform&apos;s headline &quot;offer&quot; price isn&apos;t always the cheapest across apps. {p.proTip}
          </p>
        </div>

        {/* ── Deal types ── */}
        <section>
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Types of {p.name} Offers You&apos;ll Find
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {p.dealTypes.map((d) => (
              <div key={d.title} className="bg-white rounded-2xl border border-surface-100 p-4">
                <p className="font-extrabold text-surface-900 text-sm mb-1">{d.title}</p>
                <p className="text-[12px] text-surface-500 leading-relaxed">{d.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Best categories ── */}
        <section>
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            Where {p.name} Deals Save You the Most
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.bestCategories.map((c) => (
              <span key={c} className="text-sm font-semibold bg-white border border-surface-200 text-surface-700 px-3 py-1.5 rounded-full">
                ✓ {c}
              </span>
            ))}
          </div>
        </section>

        {/* ── Best timing ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-amber-800 mb-1">🗓️ When {p.name} deals are best</p>
          <p className="text-sm text-amber-700 leading-relaxed">{p.bestTiming}</p>
        </div>

        {/* ── How to never miss a deal (CTA-style content) ── */}
        <section className="bg-white rounded-2xl border border-surface-100 p-6">
          <h2 className="text-xl font-extrabold text-surface-900 mb-3">
            How to Always Get the Best {p.name} Price
          </h2>
          <ol className="space-y-3 text-sm text-surface-700">
            <li className="flex gap-3">
              <span className="font-black text-brand-600">1.</span>
              <span>Search the product on PriceBasket — it pulls live prices from {p.name}, Blinkit, Zepto, BigBasket and JioMart in one place.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-brand-600">2.</span>
              <span>Check whether {p.name}&apos;s deal price actually beats the others for that exact item — often it does on its strong categories, sometimes it doesn&apos;t.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-brand-600">3.</span>
              <span>Set a price alert on items you rebuy so you&apos;re notified the moment {p.name} (or any app) drops the price.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-black text-brand-600">4.</span>
              <span>For a full cart, let PriceBasket split it across platforms so each item comes from wherever it&apos;s cheapest.</span>
            </li>
          </ol>
        </section>

        {/* ── FAQ ── */}
        <section>
          <h2 className="text-xl font-extrabold text-surface-900 mb-4">
            {p.name} Offers — Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {p.faq.map((f) => (
              <div key={f.q} className="bg-white rounded-2xl border border-surface-100 p-5">
                <h3 className="font-bold text-surface-900 text-sm mb-2">{f.q}</h3>
                <p className="text-[13px] text-surface-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cross-links: other platform deal pages ── */}
        <section>
          <h2 className="text-base font-extrabold text-surface-900 mb-3">
            Compare Offers on Other Apps
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {otherPlatforms.map((s) => (
              <Link key={s} href={`/deals/${s}`}
                className="bg-white rounded-xl border border-surface-100 p-3 text-sm font-semibold
                           text-brand-600 hover:border-brand-300 hover:shadow-sm transition-all text-center">
                {DEAL_PLATFORMS[s].emoji} {DEAL_PLATFORMS[s].name} →
              </Link>
            ))}
            <Link href="/best-grocery-deals"
              className="bg-white rounded-xl border border-surface-100 p-3 text-sm font-semibold
                         text-brand-600 hover:border-brand-300 hover:shadow-sm transition-all text-center">
              🔥 All grocery deals →
            </Link>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">
            Don&apos;t Just Trust the {p.name} &quot;Deal&quot; Price
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Compare {p.name} against 7 other apps in 2 seconds. Free. No app download.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/search"
              className="bg-white text-brand-700 font-extrabold px-8 py-3 rounded-2xl
                         hover:bg-orange-50 transition-colors text-sm">
              🔍 Compare Prices Now
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
