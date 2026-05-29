import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Advertise With Us – PriceBasket",
  description: "Reach high-intent grocery shoppers across India. Advertising opportunities on PriceBasket — banners, sponsored listings, price alerts, and more.",
};

const AD_FORMATS = [
  {
    emoji: "📌",
    title: "Sponsored Listings",
    desc: "Pin your products at the top of relevant search results and category pages. Pay only for clicks — no impression fees.",
    badge: "Most Popular",
    badgeColor: "bg-brand-100 text-brand-700",
  },
  {
    emoji: "🏷️",
    title: "Featured Platform Placement",
    desc: "Get your platform logo featured prominently on the homepage and in the price comparison widget alongside organic results.",
    badge: null,
    badgeColor: "",
  },
  {
    emoji: "🔔",
    title: "Price Alert Sponsorship",
    desc: "When a user's price alert fires, include a co-branded message from your platform. Highly targeted — only users already interested in that product.",
    badge: "High Conversion",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    emoji: "📧",
    title: "Newsletter Sponsorship",
    desc: "Reach our engaged subscriber base with a featured spot in our weekly 'Best Deals' email newsletter. Includes click-through tracking.",
    badge: null,
    badgeColor: "",
  },
  {
    emoji: "🖼️",
    title: "Display Banners",
    desc: "Premium banner placements on the homepage, search results, and category pages. Available in desktop and mobile formats.",
    badge: null,
    badgeColor: "",
  },
  {
    emoji: "📊",
    title: "Category Sponsorship",
    desc: "Sponsor an entire product category (e.g., Dairy & Breakfast, Snacks & Drinks) and own top-of-page placement for all products in that category.",
    badge: "New",
    badgeColor: "bg-purple-100 text-purple-700",
  },
];

const AUDIENCE = [
  { label: "Monthly Active Users", value: "50K+" },
  { label: "Avg. Session Duration", value: "4.2 min" },
  { label: "Purchase Intent", value: "High" },
  { label: "Mobile Users", value: "78%" },
  { label: "Cities Covered", value: "25+" },
  { label: "Products Tracked", value: "500+" },
];

export default function AdvertisePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

      {/* Hero */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Advertising</p>
        <h1 className="text-3xl font-bold text-surface-900 mb-3">Advertise With Us</h1>
        <p className="text-surface-500 text-base leading-relaxed max-w-2xl">
          PriceBasket attracts shoppers who are actively comparing prices — the highest-intent audience in grocery e-commerce.
          Put your brand in front of people who are ready to buy.
        </p>
        <a
          href="mailto:founder@pricebasket.in?subject=Advertising%20Enquiry"
          className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.97]"
        >
          Get a Media Kit →
        </a>
      </div>

      {/* Audience stats */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Our Audience</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AUDIENCE.map((a) => (
            <div key={a.label} className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
              <p className="text-xl font-black text-brand-600">{a.value}</p>
              <p className="text-[11px] text-surface-500 font-medium mt-0.5">{a.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ad formats */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-5">Advertising Formats</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {AD_FORMATS.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-2xl">{f.emoji}</span>
                {f.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-surface-900 text-sm mb-1.5">{f.title}</h3>
              <p className="text-surface-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why advertise */}
      <div className="bg-surface-50 rounded-2xl border border-surface-200 p-6 mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-4">Why Advertise on PriceBasket?</h2>
        <ul className="space-y-2.5 text-sm text-surface-600">
          <li className="flex items-start gap-2"><span className="text-brand-600 font-bold mt-0.5">✓</span> Users visit with purchase intent — no awareness-stage browsing.</li>
          <li className="flex items-start gap-2"><span className="text-brand-600 font-bold mt-0.5">✓</span> Contextual targeting — your ad appears when users search for relevant products.</li>
          <li className="flex items-start gap-2"><span className="text-brand-600 font-bold mt-0.5">✓</span> Performance-based pricing — pay for results, not just impressions.</li>
          <li className="flex items-start gap-2"><span className="text-brand-600 font-bold mt-0.5">✓</span> Transparent reporting — full dashboard with click, conversion, and ROI data.</li>
          <li className="flex items-start gap-2"><span className="text-brand-600 font-bold mt-0.5">✓</span> No minimum spend — suitable for brands of all sizes.</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-8 text-white text-center">
        <h2 className="text-xl font-black mb-2">Ready to Grow?</h2>
        <p className="text-orange-100 text-sm mb-5 max-w-md mx-auto">
          Contact us for a personalised media kit, rate card, and audience report. We respond within 1 business day.
        </p>
        <a
          href="mailto:founder@pricebasket.in?subject=Advertising%20Enquiry"
          className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors"
        >
          ✉️ founder@pricebasket.in
        </a>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to PriceBasket</Link>
      </div>
    </div>
  );
}
