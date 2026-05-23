import Link from "next/link";
import { MOCK_CATEGORIES } from "@/lib/mockData";

const USEFUL_LINKS = [
  { label: "Blog",           href: "/blog" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use",   href: "/terms" },
  { label: "FAQs",           href: "/faqs" },
  { label: "Security",       href: "/security" },
  { label: "Contact Us",     href: "/contact" },
];

const BUSINESS_LINKS = [
  { label: "List Your Platform", href: "/partner" },
  { label: "Advertise With Us",  href: "/advertise" },
  { label: "API Access",         href: "/api-docs" },
  { label: "Press & Media",      href: "/press" },
];

const EXPLORE_LINKS = [
  { label: "Price Alerts",     href: "/alerts" },
  { label: "Top Deals",        href: "/search?sort=discount" },
  { label: "Compare Prices",   href: "/search" },
  { label: "All Categories",   href: "/search" },
  { label: "Track My Savings", href: "/profile" },
];

const PLATFORMS = [
  "Blinkit",
  "Zepto",
  "Swiggy Instamart",
  "BigBasket",
  "Amazon Fresh",
  "Flipkart Minutes",
  "Dunzo",
  "Nykaa",
  "JioMart",
  "DMart Ready",
];

export function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300">
      <div className="max-w-screen-xl mx-auto px-4 pt-10">

        {/* ── Brand + Download App ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-8 border-b border-surface-700">
          <div>
            <h2 className="text-2xl font-black tracking-tight mb-1.5">
              <span className="text-white">Price</span>
              <span className="text-brand-400">Basket</span>
            </h2>
            <p className="text-surface-400 text-sm max-w-xs leading-relaxed">
              Compare grocery prices across 10+ quick commerce platforms. Save money, shop smarter.
            </p>
            <a
              href="tel:+918005828390"
              className="inline-flex items-center gap-1.5 mt-3 text-surface-300 hover:text-brand-400 text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
              +91 8005828390
            </a>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
              Download App
            </p>
            <div className="flex gap-2">
              <a
                href="#"
                className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700
                           border border-surface-600 rounded-xl px-4 py-2.5 transition-colors"
              >
                <span className="text-xl leading-none">🍎</span>
                <div>
                  <p className="text-[10px] text-surface-500 leading-none">Download on the</p>
                  <p className="text-sm font-semibold text-white leading-tight">App Store</p>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700
                           border border-surface-600 rounded-xl px-4 py-2.5 transition-colors"
              >
                <span className="text-xl leading-none">▶</span>
                <div>
                  <p className="text-[10px] text-surface-500 leading-none">Get it on</p>
                  <p className="text-sm font-semibold text-white leading-tight">Google Play</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* ── Links grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-8 border-b border-surface-700">
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Useful Links</h3>
            <ul className="space-y-2.5">
              {USEFUL_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-surface-400 hover:text-brand-400 text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Partner</h3>
            <ul className="space-y-2.5">
              {BUSINESS_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-surface-400 hover:text-brand-400 text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-surface-400 hover:text-brand-400 text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Categories ── */}
        <div className="py-8 border-b border-surface-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider">Categories</h3>
            <Link
              href="/search"
              className="text-brand-400 hover:text-brand-300 text-xs font-semibold transition-colors"
            >
              see all →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOCK_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/search?category=${cat.slug}`}
                className="flex items-center gap-1.5 bg-surface-800 hover:bg-surface-700
                           border border-surface-700 hover:border-brand-600
                           text-surface-300 hover:text-white
                           text-xs font-medium px-3 py-1.5 rounded-full
                           transition-all duration-150"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Platforms we compare ── */}
        <div className="py-8 border-b border-surface-700">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
            Platforms We Compare
          </h3>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="text-surface-400 text-xs px-3 py-1.5 bg-surface-800
                           border border-surface-700 rounded-full"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
                        gap-3 py-6 pb-20 md:pb-6 text-xs text-surface-500">
          <div className="flex flex-col gap-2">
            <p>© Price Basket, 2024–2026 · All rights reserved.</p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/pricebasketindia/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-surface-400 hover:text-pink-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                @pricebasketindia
              </a>
              <a
                href="https://wa.me/918005828390"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-surface-400 hover:text-green-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
          <p className="leading-relaxed sm:text-right sm:max-w-md">
            Prices are sourced in real-time from partner platforms. Price Basket does not sell products directly.
            Always verify the final price on the respective platform before purchasing.
          </p>
        </div>

      </div>
    </footer>
  );
}
