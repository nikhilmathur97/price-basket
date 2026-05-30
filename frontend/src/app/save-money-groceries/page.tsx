import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Save Money on Groceries in India 2026 — 10 Proven Tips | PriceBasket",
  description:
    "Save ₹500–₹2,000/month on groceries in India. Compare Blinkit, Zepto, BigBasket prices. Set price alerts. Use cart optimizer. 10 proven tips to cut your grocery bill.",
  keywords: [
    "how to save money on groceries india",
    "save money groceries india 2026",
    "reduce grocery bill india",
    "grocery saving tips india",
    "cheapest way to buy groceries india",
    "grocery budget tips india",
    "save money blinkit zepto",
    "grocery price comparison save money",
    "monthly grocery savings india",
    "smart grocery shopping india",
  ],
  alternates: { canonical: "https://pricebasket.in/save-money-groceries" },
  openGraph: {
    title: "How to Save Money on Groceries in India 2026 — 10 Proven Tips",
    description: "Save ₹500–₹2,000/month on groceries. Compare prices, set alerts, use cart optimizer. Free.",
    url: "https://pricebasket.in/save-money-groceries",
    type: "article",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Save Money on Groceries in India 2026 — 10 Proven Tips",
  "description": "Save ₹500–₹2,000/month on groceries in India using price comparison, price alerts, and smart shopping strategies.",
  "author": { "@type": "Organization", "name": "PriceBasket" },
  "publisher": {
    "@type": "Organization",
    "name": "PriceBasket",
    "url": "https://pricebasket.in",
  },
  "datePublished": "2026-01-01",
  "dateModified": "2026-05-30",
  "mainEntityOfPage": "https://pricebasket.in/save-money-groceries",
};

const TIPS = [
  {
    number: "01",
    emoji: "📊",
    title: "Compare Prices Before Every Order",
    desc: "The same 1L Amul milk costs ₹68 on Blinkit and ₹59 on Zepto. That's ₹9 on one product. Multiply across 20 items in your cart and you're looking at ₹100–₹300 savings per order. Use PriceBasket to compare all 8 apps in 2 seconds.",
    saving: "₹100–₹300/order",
    cta: { label: "Compare Now", href: "/search" },
  },
  {
    number: "02",
    emoji: "🔔",
    title: "Set Price Alerts for Your Regular Items",
    desc: "Platforms run flash sales and drop prices without warning. Set a price alert on PriceBasket for your regular items — atta, oil, diapers, shampoo. When any platform drops below your target price, you get an email instantly.",
    saving: "₹50–₹200/month",
    cta: { label: "Set Alert", href: "/alerts" },
  },
  {
    number: "03",
    emoji: "🛒",
    title: "Use the Cart Optimizer",
    desc: "Don't buy everything from one app. PriceBasket's cart optimizer tells you exactly which items to buy from which platform to minimise your total bill. One split order can save ₹200–₹500.",
    saving: "₹200–₹500/order",
    cta: { label: "Optimize Cart", href: "/cart" },
  },
  {
    number: "04",
    emoji: "📅",
    title: "Shop on Weekdays, Not Weekends",
    desc: "Quick-commerce platforms run more discounts on Tuesday–Thursday when order volumes are lower. Blinkit and Zepto frequently push extra 10–20% off on weekday mornings to fill capacity.",
    saving: "₹50–₹150/week",
    cta: null,
  },
  {
    number: "05",
    emoji: "🏷️",
    title: "Buy Private Labels Over Branded Products",
    desc: "BigBasket's 'BB Royal', Zepto's private label atta, and Blinkit's store brands are 20–40% cheaper than national brands with comparable quality. Switch staples like atta, rice, pulses, and oil to private labels.",
    saving: "₹200–₹600/month",
    cta: null,
  },
  {
    number: "06",
    emoji: "📦",
    title: "Buy in Bulk for Non-Perishables",
    desc: "Staples like rice, atta, dal, oil, and cleaning products are significantly cheaper in larger pack sizes. A 5kg atta pack costs 15–25% less per kg than a 1kg pack. JioMart and DMart Ready have the best bulk pricing.",
    saving: "₹300–₹800/month",
    cta: { label: "Compare Bulk Prices", href: "/search" },
  },
  {
    number: "07",
    emoji: "💳",
    title: "Stack Coupons with Price Comparison",
    desc: "Use PriceBasket to find the cheapest platform, then apply platform coupons on top. Amazon Fresh + Amazon Pay ICICI card gives 5% cashback. Zepto + Zepto Pass gives free delivery. Stack these with already-low prices.",
    saving: "₹100–₹400/month",
    cta: null,
  },
  {
    number: "08",
    emoji: "🔄",
    title: "Track Price History Before Buying",
    desc: "Platforms inflate prices before running 'sale' discounts. PriceBasket's price history shows you the 30-day trend so you know if today's 'deal' is actually a deal or just a return to normal price.",
    saving: "Avoid fake deals",
    cta: { label: "View Price History", href: "/search" },
  },
  {
    number: "09",
    emoji: "👨‍👩‍👧",
    title: "Share a WhatsApp Deal Group with Family",
    desc: "Join PriceBasket's WhatsApp community to get the day's biggest deals shared automatically. Share with your family's WhatsApp group so everyone benefits. One good deal tip can save the whole family ₹100–₹500.",
    saving: "₹100–₹500/week",
    cta: {
      label: "Join WhatsApp Deals",
      href: "https://wa.me/918005828390?text=Hi%2C%20I%20want%20daily%20grocery%20deals!",
    },
  },
  {
    number: "10",
    emoji: "📱",
    title: "Don't Be Loyal to One App",
    desc: "The biggest mistake Indian grocery shoppers make is sticking to one app out of habit. Blinkit, Zepto, and Instamart all want your business and compete aggressively on price. Switch freely based on who's cheapest today.",
    saving: "₹500–₹2,000/month",
    cta: { label: "Start Comparing", href: "/search" },
  },
];

export default function SaveMoneyGroceriesPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-3">
            Smart Grocery Shopping Guide
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            How to Save Money on Groceries in India 2026
          </h1>
          <p className="text-green-100 text-base mb-6 max-w-xl mx-auto leading-relaxed">
            10 proven strategies to cut your monthly grocery bill by ₹500–₹2,000.
            Works with Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart.
          </p>
          <div className="inline-flex items-center gap-3 bg-white/15 border border-white/30
                          rounded-2xl px-5 py-3 text-sm">
            <span className="text-2xl">💰</span>
            <span className="font-bold">Average PriceBasket user saves <strong>₹1,200/month</strong></span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Quick summary ── */}
        <div className="bg-white rounded-3xl border border-surface-100 p-6 mb-8">
          <h2 className="font-extrabold text-surface-900 text-lg mb-4">
            Quick Summary: 10 Ways to Save on Groceries
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {TIPS.map((tip) => (
              <div key={tip.number} className="flex items-center gap-2 text-sm text-surface-700">
                <span className="text-green-500 font-bold text-xs">{tip.number}</span>
                <span>{tip.title}</span>
                <span className="ml-auto text-[11px] font-bold text-green-600 whitespace-nowrap">
                  {tip.saving}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tips ── */}
        <div className="space-y-5 mb-8">
          {TIPS.map((tip) => (
            <div key={tip.number}
              className="bg-white rounded-3xl border border-surface-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center
                                  justify-center text-xl">
                    {tip.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-black text-green-600 bg-green-50
                                     border border-green-100 px-2 py-0.5 rounded-full">
                      Tip {tip.number}
                    </span>
                    <span className="text-[11px] font-bold text-surface-500">
                      Save {tip.saving}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-surface-900 text-base mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-surface-600 leading-relaxed mb-3">
                    {tip.desc}
                  </p>
                  {tip.cta && (
                    <Link
                      href={tip.cta.href}
                      target={tip.cta.href.startsWith("http") ? "_blank" : undefined}
                      rel={tip.cta.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 text-xs font-bold
                                 text-brand-600 bg-brand-50 border border-brand-100
                                 px-4 py-2 rounded-xl hover:bg-brand-100 transition-colors"
                    >
                      {tip.cta.label} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Monthly savings calculator ── */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200
                        rounded-3xl p-6 mb-8">
          <h2 className="font-extrabold text-surface-900 text-lg mb-4">
            💰 Your Potential Monthly Savings
          </h2>
          <div className="space-y-3">
            {[
              { tip: "Price comparison (every order)",    saving: "₹300" },
              { tip: "Price alerts (catching deals)",     saving: "₹150" },
              { tip: "Cart optimizer (split orders)",     saving: "₹250" },
              { tip: "Private labels for staples",        saving: "₹400" },
              { tip: "Bulk buying non-perishables",       saving: "₹300" },
            ].map((row) => (
              <div key={row.tip} className="flex items-center justify-between text-sm">
                <span className="text-surface-700 flex items-center gap-2">
                  <span className="text-green-500">✓</span> {row.tip}
                </span>
                <span className="font-extrabold text-green-700">{row.saving}</span>
              </div>
            ))}
            <div className="border-t border-green-200 pt-3 flex items-center justify-between">
              <span className="font-extrabold text-surface-900">Total Monthly Savings</span>
              <span className="text-xl font-black text-green-700">₹1,400</span>
            </div>
            <p className="text-[11px] text-surface-400">
              * Based on average Indian household grocery spend of ₹8,000–₹12,000/month
            </p>
          </div>
        </div>

        {/* ── Compare links ── */}
        <section className="mb-8">
          <h2 className="font-extrabold text-surface-900 text-lg mb-4">
            Start Comparing Prices Now
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Blinkit vs Zepto",     href: "/compare/blinkit-vs-zepto" },
              { label: "Zepto vs Instamart",   href: "/compare/zepto-vs-instamart" },
              { label: "Blinkit vs BigBasket", href: "/compare/blinkit-vs-bigbasket" },
              { label: "BigBasket vs JioMart", href: "/compare/bigbasket-vs-jiomart" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="bg-white rounded-2xl border border-surface-100 p-4
                           hover:border-brand-300 hover:shadow-md transition-all
                           flex items-center justify-between group">
                <span className="font-semibold text-sm text-surface-700 group-hover:text-brand-600">
                  {l.label}
                </span>
                <span className="text-brand-500 text-xs font-bold">Compare →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <div className="bg-gradient-to-r from-brand-600 to-orange-600 rounded-3xl p-6 text-center">
          <h2 className="text-white font-extrabold text-xl mb-2">
            Start Saving ₹1,400/Month Today
          </h2>
          <p className="text-orange-100 text-sm mb-5">
            Free forever. No app download. Compare 8 platforms in 2 seconds.
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
