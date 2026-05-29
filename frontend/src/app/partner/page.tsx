import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "List Your Platform – PriceBasket",
  description: "Partner with PriceBasket to reach millions of price-conscious shoppers across India. Get your platform listed and drive high-intent traffic.",
};

const BENEFITS = [
  {
    emoji: "🎯",
    title: "High-Intent Traffic",
    desc: "Users on PriceBasket are actively comparing prices — they are ready to buy. Our partners see significantly higher conversion rates than general ad channels.",
  },
  {
    emoji: "📈",
    title: "Real-Time Visibility",
    desc: "Your live prices appear in our comparison engine the moment they update. Win the price comparison and customers land directly on your checkout.",
  },
  {
    emoji: "🤝",
    title: "Zero Setup Fee",
    desc: "Getting listed costs nothing. We charge only on performance — you pay when customers click through to your platform.",
  },
  {
    emoji: "📊",
    title: "Performance Dashboard",
    desc: "Access a dedicated partner dashboard with impressions, click-throughs, conversion rates, and category-level insights.",
  },
  {
    emoji: "🔔",
    title: "Price Alert Integration",
    desc: "When a user sets a price alert, your platform is notified the moment you hit that price — driving instant, motivated traffic.",
  },
  {
    emoji: "🛡️",
    title: "Brand Safety",
    desc: "Your brand appears in a clean, neutral comparison environment — no competitor ads alongside your listing.",
  },
];

const STEPS = [
  { step: "01", title: "Submit Your Application", desc: "Fill in the form below with your platform details and a contact email. We review all applications within 3 business days." },
  { step: "02", title: "API or Feed Integration", desc: "We support REST APIs, product feeds (CSV/JSON), and direct scraping. Our integration team will guide you through the setup." },
  { step: "03", title: "Go Live", desc: "Once your prices are verified, your platform goes live on PriceBasket. Typical onboarding time: 1–2 weeks." },
  { step: "04", title: "Grow Together", desc: "Access your dashboard, optimise your listings, and watch the traffic grow. Our team is always available to help." },
];

export default function PartnerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

      {/* Hero */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Partner with Us</p>
        <h1 className="text-3xl font-bold text-surface-900 mb-3">List Your Platform on PriceBasket</h1>
        <p className="text-surface-500 text-base leading-relaxed max-w-2xl">
          PriceBasket compares grocery prices across 10+ quick-commerce platforms in India. Join our network to
          reach millions of high-intent shoppers who are ready to buy — right now.
        </p>
        <a
          href="mailto:founder@pricebasket.in?subject=Platform%20Listing%20Request"
          className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.97]"
        >
          Apply to Get Listed →
        </a>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { value: "10+", label: "Platforms Compared" },
          { value: "50K+", label: "Monthly Shoppers" },
          { value: "500+", label: "Products Tracked" },
        ].map((s) => (
          <div key={s.label} className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
            <p className="text-2xl font-black text-brand-600">{s.value}</p>
            <p className="text-[11px] text-surface-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-5">Why Partner with PriceBasket?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5">
              <span className="text-2xl mb-3 block">{b.emoji}</span>
              <h3 className="font-bold text-surface-900 text-sm mb-1.5">{b.title}</h3>
              <p className="text-surface-500 text-xs leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-5">How It Works</h2>
        <div className="space-y-4">
          {STEPS.map((s) => (
            <div key={s.step} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="font-bold text-surface-900 text-sm mb-0.5">{s.title}</p>
                <p className="text-surface-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-8 text-white text-center">
        <h2 className="text-xl font-black mb-2">Ready to Join?</h2>
        <p className="text-orange-100 text-sm mb-5 max-w-md mx-auto">
          Email us with your platform name, website, and a brief description of your product catalogue. We'll get back to you within 3 business days.
        </p>
        <a
          href="mailto:founder@pricebasket.in?subject=Platform%20Listing%20Request"
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
