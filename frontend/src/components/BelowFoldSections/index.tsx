"use client";

/**
 * BelowFoldSections
 * ─────────────────────────────────────────────────────────────────────────────
 * All content that appears below the product rows on the home page.
 * This component is dynamic-imported with { ssr: false } from page.tsx so its
 * entire JS chunk is excluded from the initial bundle — it only downloads and
 * executes after the above-the-fold content has painted, directly reducing TBT
 * and Speed Index.
 *
 * Sections:
 *   1. Platform Deal Cards (interactive, needs PlatformLogo SVGs)
 *   2. WhatsApp Community Banner
 *   3. Popular Price Comparisons (SEO internal links)
 *   4. Grocery Prices by City (SEO internal links)
 *   5. SEO trust / keyword-rich text section
 */

import Link from "next/link";
import { MOCK_PLATFORMS } from "@/lib/mockData";
import { PlatformLogo } from "@/components/PlatformLogo";

// ── Platform delivery badges ─────────────────────────────────────────────────
const PLATFORM_HIGHLIGHTS = [
  { slug: "blinkit",   label: "10 min" },
  { slug: "zepto",     label: "8 min"  },
  { slug: "instamart", label: "15 min" },
  { slug: "bigbasket", label: "30 min" },
  { slug: "flipkart",  label: "10 min" },
  { slug: "amazon",    label: "2 hrs"  },
  { slug: "jiomart",   label: "30 min" },
];

// ── Comparison pairs for SEO internal links ──────────────────────────────────
const COMPARE_PAIRS = [
  { a: "blinkit",   b: "zepto",     label: "Blinkit vs Zepto"      },
  { a: "zepto",     b: "instamart", label: "Zepto vs Instamart"     },
  { a: "blinkit",   b: "bigbasket", label: "Blinkit vs BigBasket"   },
  { a: "zepto",     b: "bigbasket", label: "Zepto vs BigBasket"     },
  { a: "blinkit",   b: "instamart", label: "Blinkit vs Instamart"   },
  { a: "bigbasket", b: "jiomart",   label: "BigBasket vs JioMart"   },
];

export function BelowFoldSections() {
  return (
    <>
      {/* ── Platform Deal Cards ── */}
      <div className="mb-6">
        <h2 className="text-sm font-extrabold text-surface-800 mb-3 flex items-center gap-2">
          <span className="text-base">🏪</span>
          Shop by Platform
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {MOCK_PLATFORMS.slice(0, 4).map((p) => {
            const highlight = PLATFORM_HIGHLIGHTS.find((h) => h.slug === p.slug);
            return (
              <Link
                key={p.slug}
                href={`/deals/${p.slug}`}
                aria-label={`Shop ${p.name} deals`}
                className="flex flex-col items-center gap-2 bg-white rounded-2xl
                           border border-surface-100 px-4 py-4
                           hover:border-brand-300 hover:shadow-md
                           transition-all duration-150 group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: (p.color_hex ?? "#e5e7eb") + "20" }}
                >
                  <PlatformLogo slug={p.slug} name={p.name} colorHex={p.color_hex} size={28} />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-surface-800">{p.name}</p>
                  {highlight && (
                    // Use text-surface-600 instead of raw color_hex — platform colours like
                    // #84C225 (BigBasket green) fail WCAG AA (2.4:1) at small font sizes.
                    <p className="text-[11px] font-semibold mt-0.5 text-surface-600">
                      ⚡ {highlight.label} delivery
                    </p>
                  )}
                </div>
                {/* text-brand-700 (#c2410c) on bg-brand-100 (#ffedd5) = 5.1:1 — passes WCAG AA */}
                <span className="text-[11px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full" aria-hidden="true">
                  See deals →
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── WhatsApp Community Join Banner ── */}
      <div className="my-6 rounded-3xl overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
        <div className="px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
              💬
            </div>
            <div>
              <p className="text-white font-extrabold text-base leading-tight">
                Get Daily Deals on WhatsApp — Free!
              </p>
              <p className="text-green-100 text-sm mt-0.5">
                Join 10,000+ smart shoppers saving ₹500/month on groceries
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/918005828390?text=Hi%2C%20I%20want%20to%20join%20PriceBasket%20daily%20deals!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-white text-green-700 font-extrabold text-sm
                       px-6 py-3 rounded-2xl hover:bg-green-50 transition-colors
                       shadow-md active:scale-95 whitespace-nowrap"
          >
            Join WhatsApp →
          </a>
        </div>
      </div>

      {/* ── Price Comparison Quick Links (SEO + UX) ── */}
      <div className="mb-6">
        <h2 className="text-sm font-extrabold text-surface-800 mb-3 flex items-center gap-2">
          <span className="text-base">⚡</span>
          Popular Price Comparisons
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMPARE_PAIRS.map((pair) => (
            <Link
              key={`${pair.a}-${pair.b}`}
              href={`/compare/${pair.a}-vs-${pair.b}`}
              aria-label={`Compare ${pair.label} prices`}
              className="flex items-center justify-between bg-white rounded-2xl
                         border border-surface-100 px-4 py-3
                         hover:border-brand-300 hover:shadow-md
                         transition-all duration-150 group"
            >
              <span className="text-sm font-semibold text-surface-700 group-hover:text-brand-700">
                {pair.label}
              </span>
              {/* text-brand-700 (#c2410c) on white = 5.4:1 — passes WCAG AA */}
              <span className="text-brand-700 text-xs font-bold" aria-hidden="true">Compare →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── City price pages ── */}
      <div className="mb-6">
        <h2 className="text-sm font-extrabold text-surface-800 mb-3 flex items-center gap-2">
          <span className="text-base">📍</span>
          Grocery Prices by City
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { city: "mumbai",    label: "Mumbai"    },
            { city: "delhi",     label: "Delhi"     },
            { city: "bangalore", label: "Bangalore" },
            { city: "hyderabad", label: "Hyderabad" },
            { city: "chennai",   label: "Chennai"   },
            { city: "pune",      label: "Pune"      },
            { city: "kolkata",   label: "Kolkata"   },
            { city: "ahmedabad", label: "Ahmedabad" },
          ].map(({ city, label }) => (
            <Link
              key={city}
              href={`/grocery-prices-${city}`}
              className="text-[12px] font-semibold text-surface-600 bg-white
                         border border-surface-100 px-3 py-1.5 rounded-full
                         hover:border-brand-300 hover:text-brand-600
                         transition-all duration-150"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── SEO keyword-rich trust section ── */}
      <section className="bg-white rounded-3xl border border-surface-100 p-6 mb-6">
        <h1 className="text-lg font-extrabold text-surface-900 mb-2">
          India&apos;s Smartest Grocery Price Comparison — Blinkit vs Zepto vs BigBasket
        </h1>
        <p className="text-sm text-surface-600 leading-relaxed mb-4">
          PriceBasket compares real-time grocery prices across <strong>Blinkit, Zepto,
          Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Minutes, JioMart</strong> and
          DMart Ready — 10 platforms in one place. The same 500ml Dettol can costs ₹89 on
          Blinkit and ₹72 on JioMart. PriceBasket finds that in 2 seconds, for free. Stop
          overpaying for fruits, vegetables, dairy, snacks and household essentials — compare
          Blinkit vs Zepto prices or BigBasket vs Swiggy Instamart in one tap.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { emoji: "🔍", title: "Real-Time Prices", desc: "Live data from 10 apps"  },
            { emoji: "🔔", title: "Price Alerts",     desc: "Get notified on drops"   },
            { emoji: "🛒", title: "Cart Optimizer",   desc: "Max savings per order"   },
            { emoji: "💰", title: "Save ₹500/month",  desc: "Average user saving"     },
          ].map((f) => (
            <div key={f.title} className="text-center p-3 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="text-2xl mb-1">{f.emoji}</div>
              {/* text-surface-900 (#171717) on bg-orange-50 (#fff7ed) = 16.8:1 — passes */}
              <p className="text-xs font-extrabold text-surface-900">{f.title}</p>
              {/* text-surface-600 (#525252) on bg-orange-50 (#fff7ed) = 6.8:1 — passes WCAG AA */}
              <p className="text-[10px] text-surface-600 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-extrabold text-surface-900 mb-2">How PriceBasket Works</h2>
        <ol className="text-sm text-surface-600 leading-relaxed space-y-1.5 list-decimal list-inside mb-4">
          <li><strong>Search</strong> any grocery product — atta, milk, eggs, vegetables, or any brand.</li>
          <li><strong>Compare</strong> live prices from Blinkit, Zepto, BigBasket, Instamart, JioMart &amp; more side by side.</li>
          <li><strong>Buy</strong> from the cheapest platform — save ₹340 on average per order, ₹500–₹2,000 per month.</li>
        </ol>

        <h2 className="text-base font-extrabold text-surface-900 mb-2">Why Use PriceBasket?</h2>
        <p className="text-sm text-surface-600 leading-relaxed mb-3">
          Quick-commerce apps like Blinkit, Zepto and Swiggy Instamart charge different prices
          for the same product — sometimes a 20–40% difference. PriceBasket tracks prices for
          thousands of products across all major platforms and shows you who is cheapest right now.
          Set price alerts for your favourite products, optimise your cart to split orders across
          platforms, and never pay more than you have to for fresh fruits, vegetables, dairy,
          packaged staples or household items. 100% free, no app download needed.
        </p>

        <h2 className="text-base font-extrabold text-surface-900 mb-2">What Can You Compare?</h2>
        <p className="text-sm text-surface-600 leading-relaxed mb-3">
          Compare prices on everything — <strong>fresh fruits and vegetables</strong>, milk, eggs,
          bread, atta, rice, cooking oil, pulses, packaged snacks, soft drinks, household
          cleaners, personal care products, baby food and pet supplies. Search by product name
          or brand (e.g. Amul, Aashirvaad, Tata, Parle, Maggi) and instantly see which
          platform has the lowest price today.
        </p>

        <h2 className="text-base font-extrabold text-surface-900 mb-2">Which Cities Are Covered?</h2>
        <p className="text-sm text-surface-600 leading-relaxed">
          PriceBasket is available across all major Indian cities — <strong>Mumbai, Delhi,
          Bangalore, Hyderabad, Chennai, Pune, Kolkata</strong> and Ahmedabad — wherever
          Blinkit, Zepto, Swiggy Instamart, BigBasket or JioMart deliver. Prices shown are
          based on your selected delivery location, so you always see the most accurate
          comparison for your area.
        </p>
      </section>
    </>
  );
}
