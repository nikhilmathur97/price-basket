import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  FEATURED_MATCHUPS,
  parseMatchup,
  type PlatformInfo,
} from "@/lib/platforms";
import { SITE_URL } from "@/lib/server-api";

interface PageProps {
  params: { matchup: string };
}

// Pre-render the high-volume matchups; others render on-demand (still indexable).
export function generateStaticParams() {
  return FEATURED_MATCHUPS.map(([a, b]) => ({ matchup: `${a}-vs-${b}` }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const m = parseMatchup(params.matchup);
  if (!m) return { title: "Compare Platforms" };

  const title = `${m.a.name} vs ${m.b.name}: Which is Cheaper in 2026? — Price Comparison India`;
  const description = `Compare ${m.a.name} vs ${m.b.name} prices in real-time across Mumbai, Delhi, Bangalore, Hyderabad. Find cheapest grocery delivery. Free price alerts on PriceBasket.`;
  const url = `${SITE_URL}/compare/${m.a.slug}-vs-${m.b.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function PlatformCard({ p }: { p: PlatformInfo }) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-surface-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-lg"
          style={{ backgroundColor: p.color }}
        >
          {p.name.charAt(0)}
        </div>
        <div>
          <h2 className="font-extrabold text-surface-900 leading-tight">{p.name}</h2>
          <p className="text-xs text-surface-400">{p.delivery}</p>
        </div>
      </div>
      <p className="text-sm text-surface-600 mb-3 leading-relaxed">{p.blurb}</p>
      <ul className="space-y-1.5">
        {p.strengths.map((s) => (
          <li key={s} className="text-[13px] text-surface-700 flex items-center gap-2">
            <span className="text-green-500">✓</span> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ComparePage({ params }: PageProps) {
  const m = parseMatchup(params.matchup);
  if (!m) notFound();
  const { a, b } = m;

  const faqs = [
    {
      q: `Is ${a.name} cheaper than ${b.name}?`,
      a: `Neither is cheaper on everything. Across a typical grocery cart, the lower total shifts between ${a.name} and ${b.name} by item and by day. PriceBasket compares both live so you always see which wins for your specific cart. On average, users save ₹340 per order by comparing before buying.`,
    },
    {
      q: `Which delivers faster, ${a.name} or ${b.name}?`,
      a: `${a.name} typically delivers in ${a.delivery}, while ${b.name} delivers in ${b.delivery}. Actual times depend on your locality and the nearest dark store. Both offer 10-minute delivery in most Tier 1 cities.`,
    },
    {
      q: `Should I use ${a.name} or ${b.name}?`,
      a: `Use whichever is cheaper for the cart you have right now. The smartest approach is to compare both before checkout — that single habit saves most shoppers 20%+ over committing to one app. PriceBasket makes this comparison instant and free.`,
    },
    {
      q: `Which is better in Mumbai — ${a.name} or ${b.name}?`,
      a: `Both ${a.name} and ${b.name} operate across Mumbai. Prices can vary by neighbourhood and time of day. Use PriceBasket to compare live prices in your Mumbai pincode before ordering.`,
    },
    {
      q: `Which is better in Delhi — ${a.name} or ${b.name}?`,
      a: `${a.name} and ${b.name} both have strong coverage in Delhi NCR. PriceBasket tracks real-time prices across both platforms so Delhi shoppers can always find the cheapest option.`,
    },
    {
      q: `How much can I save by comparing ${a.name} vs ${b.name}?`,
      a: `PriceBasket users save an average of ₹340 per order and ₹500–₹2,000 per month by always buying from the cheapest platform. The savings add up significantly over a year — that's ₹6,000–₹24,000 annually.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
        Platform Comparison
      </p>
      <h1 className="text-2xl sm:text-3xl font-black text-surface-900 mb-3 leading-tight">
        {a.name} vs {b.name}: Which is Cheaper in 2026?
      </h1>
      <p className="text-surface-500 mb-4 leading-relaxed">
        We track live grocery prices on both {a.name} and {b.name} across India — Mumbai,
        Delhi, Bangalore, Hyderabad, Chennai, Pune and more. Here is how they stack up —
        and how to always pay the lower price.
      </p>
      {/* City pills — boosts local SEO */}
      <div className="flex flex-wrap gap-2 mb-8">
        {["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"].map((city) => (
          <span key={city}
            className="text-[11px] font-semibold bg-orange-50 border border-orange-200
                       text-orange-700 px-3 py-1 rounded-full">
            📍 {city}
          </span>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <PlatformCard p={a} />
        <PlatformCard p={b} />
      </div>

      <section className="bg-gradient-to-r from-brand-50 to-orange-50 border border-brand-100 rounded-2xl p-6 mb-8">
        <h2 className="font-extrabold text-surface-900 mb-2">
          The honest answer: it depends on your cart
        </h2>
        <p className="text-sm text-surface-600 leading-relaxed mb-4">
          Quick-commerce prices move daily. Over a month, comparing each order
          instead of committing to one platform saves a typical cart 20–35%.
          Don&apos;t memorise which app is &quot;cheapest&quot; — compare in real time.
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          Compare {a.name} &amp; {b.name} prices now →
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-extrabold text-surface-900 mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="bg-white rounded-2xl border border-surface-100 p-5">
              <h3 className="font-bold text-surface-900 text-sm mb-1.5">{f.q}</h3>
              <p className="text-[13px] text-surface-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── More comparisons (internal linking for SEO) ── */}
      <section className="mb-8">
        <h2 className="text-base font-extrabold text-surface-900 mb-3">
          More Price Comparisons
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Blinkit vs Zepto",       href: "/compare/blinkit-vs-zepto" },
            { label: "Zepto vs Instamart",     href: "/compare/zepto-vs-instamart" },
            { label: "Blinkit vs BigBasket",   href: "/compare/blinkit-vs-bigbasket" },
            { label: "BigBasket vs JioMart",   href: "/compare/bigbasket-vs-jiomart" },
            { label: "Zepto vs BigBasket",     href: "/compare/zepto-vs-bigbasket" },
            { label: "Blinkit vs Instamart",   href: "/compare/blinkit-vs-instamart" },
          ]
            .filter((l) => !l.href.includes(`${a.slug}-vs-${b.slug}`) && !l.href.includes(`${b.slug}-vs-${a.slug}`))
            .map((l) => (
              <Link key={l.href} href={l.href}
                className="text-sm text-brand-600 hover:text-brand-700 bg-white
                           border border-surface-100 rounded-xl px-4 py-2.5
                           hover:border-brand-200 hover:shadow-sm transition-all">
                {l.label} →
              </Link>
            ))}
        </div>
      </section>

      {/* ── WhatsApp CTA ── */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 mb-8 text-center">
        <p className="text-white font-extrabold text-base mb-1">
          Get daily {a.name} vs {b.name} deals on WhatsApp
        </p>
        <p className="text-green-100 text-sm mb-3">
          Free alerts when prices drop. Join 10,000+ smart shoppers.
        </p>
        <a
          href="https://wa.me/918005828390?text=Hi%2C%20I%20want%20daily%20grocery%20deals!"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-green-700 font-extrabold text-sm
                     px-6 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
        >
          Join WhatsApp Deals →
        </a>
      </div>

      <div className="text-center">
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          ← Back to PriceBasket
        </Link>
      </div>
    </div>
  );
}
