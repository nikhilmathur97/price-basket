import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Press & Media – PriceBasket",
  description: "PriceBasket press kit, brand assets, company facts, and media contact for journalists and content creators.",
};

const FACTS = [
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "India" },
  { label: "Platforms Compared", value: "10+" },
  { label: "Products Tracked", value: "500+" },
  { label: "Monthly Users", value: "50,000+" },
  { label: "Cities Covered", value: "25+" },
];

const COVERAGE = [
  {
    title: "Quick Commerce Price Wars: How Indian Shoppers Are Winning",
    outlet: "YourStory",
    date: "April 2025",
    type: "Feature",
  },
  {
    title: "PriceBasket Launches Price Alerts for Blinkit, Zepto, and Swiggy Instamart",
    outlet: "Inc42",
    date: "March 2025",
    type: "News",
  },
  {
    title: "The App That Tells You Which Delivery App Is Cheapest Right Now",
    outlet: "The Better India",
    date: "February 2025",
    type: "Review",
  },
];

export default function PressPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Press & Media</p>
        <h1 className="text-3xl font-bold text-surface-900 mb-3">PriceBasket Newsroom</h1>
        <p className="text-surface-500 text-base leading-relaxed max-w-2xl">
          Resources for journalists, bloggers, and content creators covering India's quick-commerce and consumer
          technology space.
        </p>
      </div>

      {/* Media contact */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-1">Media Contact</h2>
        <p className="text-surface-500 text-sm mb-4">
          For press enquiries, interview requests, or high-resolution brand assets, contact us directly:
        </p>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-surface-800">PriceBasket Communications Team</p>
          <p className="text-sm text-surface-600">
            Email:{" "}
            <a href="mailto:founder@pricebasket.in?subject=Press%20Enquiry" className="text-brand-600 hover:underline font-medium">
              founder@pricebasket.in
            </a>
            {" "}(Subject: Press Enquiry)
          </p>
          <p className="text-sm text-surface-600">
            Phone:{" "}
            <a href="tel:+918005828390" className="text-brand-600 hover:underline">
              +91 80058 28390
            </a>
          </p>
          <p className="text-[11px] text-surface-400 mt-2">Response time: within 24 hours on business days.</p>
        </div>
      </div>

      {/* Company facts */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Company at a Glance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FACTS.map((f) => (
            <div key={f.label} className="bg-white rounded-2xl border border-surface-100 shadow-sm p-4 text-center">
              <p className="text-lg font-black text-brand-600">{f.value}</p>
              <p className="text-[11px] text-surface-500 font-medium mt-0.5">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-6 mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-3">About PriceBasket</h2>
        <div className="space-y-3 text-sm text-surface-600 leading-relaxed">
          <p>
            PriceBasket is India's leading quick-commerce price comparison platform. We track real-time grocery prices
            across 10+ platforms — including Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, JioMart, and
            Flipkart Minutes — giving shoppers a single view of where to buy at the best price.
          </p>
          <p>
            Founded in 2024, PriceBasket was built on a simple belief: Indian consumers deserve price transparency.
            With the rise of quick commerce, the same product can vary by 20–40% in price across competing apps.
            PriceBasket makes it effortless to spot the best deal in seconds.
          </p>
          <p>
            Our platform serves over 50,000 monthly shoppers across 25+ Indian cities. Key features include real-time
            price comparison, personalised price drop alerts, cart-based savings tracking, and voice search.
          </p>
        </div>
      </div>

      {/* Brand assets */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Brand Assets</h2>
        <p className="text-surface-500 text-sm mb-5">
          Download our official logo, brand colours, and usage guidelines. Please do not modify the logo or use it in
          a context that implies endorsement without written permission.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Logo (PNG, White BG)", icon: "🖼️" },
            { label: "Logo (SVG, Transparent)", icon: "✏️" },
            { label: "Brand Guidelines PDF", icon: "📄" },
          ].map((a) => (
            <a
              key={a.label}
              href={`mailto:founder@pricebasket.in?subject=Brand%20Asset%20Request&body=Please%20send%20me%20the%20${encodeURIComponent(a.label)}`}
              className="bg-white border border-surface-200 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:border-brand-400 hover:shadow-sm transition-all"
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="text-xs font-semibold text-surface-700">{a.label}</span>
              <span className="text-[11px] text-brand-600">Request via email →</span>
            </a>
          ))}
        </div>
      </div>

      {/* Brand colours */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Brand Colours</h2>
        <div className="flex flex-wrap gap-4">
          {[
            { name: "Brand Orange", hex: "#EA580C", cls: "bg-[#EA580C]" },
            { name: "Dark Orange", hex: "#C2410C", cls: "bg-[#C2410C]" },
            { name: "Surface Black", hex: "#0A0A0A", cls: "bg-[#0A0A0A]" },
            { name: "Surface White", hex: "#FFFFFF", cls: "bg-white border border-surface-200" },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.cls} flex-shrink-0`} />
              <div>
                <p className="text-xs font-bold text-surface-900">{c.name}</p>
                <p className="text-[11px] text-surface-400 font-mono">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Press coverage */}
      {COVERAGE.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-surface-900 mb-4">Press Coverage</h2>
          <div className="space-y-3">
            {COVERAGE.map((c) => (
              <div key={c.title} className="bg-white rounded-xl border border-surface-100 shadow-sm p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-surface-900 mb-0.5">{c.title}</p>
                  <p className="text-[12px] text-surface-400">{c.outlet} · {c.date}</p>
                </div>
                <span className="text-[10px] font-bold bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full flex-shrink-0">
                  {c.type}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-3">
            For a full list of press mentions or to request a review copy, email{" "}
            <a href="mailto:founder@pricebasket.in?subject=Press%20Coverage" className="text-brand-600 hover:underline">
              founder@pricebasket.in
            </a>.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-8 text-white text-center">
        <h2 className="text-xl font-black mb-2">Writing About PriceBasket?</h2>
        <p className="text-orange-100 text-sm mb-5 max-w-md mx-auto">
          We're happy to provide data, quotes, product demos, or founder interviews. Get in touch and we'll respond the same business day.
        </p>
        <a
          href="mailto:founder@pricebasket.in?subject=Press%20Enquiry"
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
