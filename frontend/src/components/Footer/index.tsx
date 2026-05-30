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
  { label: "Price Alerts",          href: "/alerts" },
  { label: "Top Deals",             href: "/search?sort=discount" },
  { label: "Compare Prices",        href: "/search" },
  { label: "Best Grocery Deals",    href: "/best-grocery-deals" },
  { label: "Save Money Groceries",  href: "/save-money-groceries" },
  { label: "Track My Savings",      href: "/profile" },
];

// SEO-rich comparison links — these pages rank for high-intent searches
const COMPARE_LINKS = [
  { label: "Blinkit vs Zepto",       href: "/compare/blinkit-vs-zepto" },
  { label: "Zepto vs Instamart",     href: "/compare/zepto-vs-instamart" },
  { label: "Blinkit vs BigBasket",   href: "/compare/blinkit-vs-bigbasket" },
  { label: "BigBasket vs JioMart",   href: "/compare/bigbasket-vs-jiomart" },
  { label: "Zepto vs BigBasket",     href: "/compare/zepto-vs-bigbasket" },
  { label: "Blinkit vs Instamart",   href: "/compare/blinkit-vs-instamart" },
  { label: "Amazon vs Blinkit",      href: "/compare/amazon-vs-blinkit" },
  { label: "Flipkart vs Zepto",      href: "/compare/flipkart-vs-zepto" },
];

const PLATFORMS = [
  "Blinkit", "Zepto", "Swiggy Instamart", "BigBasket",
  "Amazon Fresh", "Flipkart Minutes", "Dunzo", "JioMart", "DMart Ready",
];

export function Footer() {
  return (
    <footer>

      {/* ── Orange top band — brand + download ── */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-orange-500">
        <div className="max-w-screen-xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

          {/* Brand */}
          <div>
            <h2 className="text-2xl font-black tracking-tight mb-1.5">
              <span className="text-white">Price</span>
              <span className="text-yellow-300">Basket</span>
            </h2>
            <p className="text-orange-100 text-sm max-w-xs leading-relaxed">
              Compare grocery prices across 10+ quick commerce platforms. Save money, shop smarter.
            </p>
            <a
              href="tel:+918005828390"
              className="inline-flex items-center gap-1.5 mt-3 text-white/80 hover:text-white text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
              +91 8005828390
            </a>
          </div>

          {/* Download App */}
          <div>
            <p className="text-[11px] font-semibold text-orange-200 uppercase tracking-wider mb-2">
              Download App
            </p>
            <div className="flex gap-2">
              <a
                href="#"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20
                           border border-white/30 rounded-xl px-4 py-2.5 transition-colors"
              >
                <span className="text-xl leading-none">🍎</span>
                <div>
                  <p className="text-[10px] text-orange-200 leading-none">Download on the</p>
                  <p className="text-sm font-semibold text-white leading-tight">App Store</p>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20
                           border border-white/30 rounded-xl px-4 py-2.5 transition-colors"
              >
                <span className="text-xl leading-none">▶</span>
                <div>
                  <p className="text-[10px] text-orange-200 leading-none">Get it on</p>
                  <p className="text-sm font-semibold text-white leading-tight">Google Play</p>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── White middle — links + categories + platforms ── */}
      <div className="bg-white">
        <div className="max-w-screen-xl mx-auto px-4">

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-b border-surface-200">
            <div>
              <h3 className="text-surface-900 text-xs font-bold uppercase tracking-wider mb-4">Useful Links</h3>
              <ul className="space-y-2.5">
                {USEFUL_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-surface-500 hover:text-brand-600 text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-surface-900 text-xs font-bold uppercase tracking-wider mb-4">Partner</h3>
              <ul className="space-y-2.5">
                {BUSINESS_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-surface-500 hover:text-brand-600 text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-surface-900 text-xs font-bold uppercase tracking-wider mb-4">Resources</h3>
              <ul className="space-y-2.5">
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-surface-500 hover:text-brand-600 text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compare links — high SEO value internal links */}
            <div>
              <h3 className="text-surface-900 text-xs font-bold uppercase tracking-wider mb-4">Compare Prices</h3>
              <ul className="space-y-2.5">
                {COMPARE_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-surface-500 hover:text-brand-600 text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Categories */}
          <div className="py-8 border-b border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-surface-900 text-xs font-bold uppercase tracking-wider">Categories</h3>
              <Link href="/search" className="text-brand-600 hover:text-brand-700 text-xs font-semibold transition-colors">
                see all →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOCK_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/search?category=${cat.slug}`}
                  className="flex items-center gap-1.5 bg-orange-50 hover:bg-brand-600
                             border border-orange-200 hover:border-brand-600
                             text-surface-700 hover:text-white
                             text-xs font-medium px-3 py-1.5 rounded-full
                             transition-all duration-150"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Platforms we compare */}
          <div className="py-8">
            <h3 className="text-surface-900 text-xs font-bold uppercase tracking-wider mb-4">
              Platforms We Compare
            </h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="text-surface-500 text-xs px-3 py-1.5 bg-surface-100
                             border border-surface-200 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── SEO keyword paragraph (crawlable, subtle styling) ── */}
      <div className="bg-surface-50 border-t border-surface-200">
        <div className="max-w-screen-xl mx-auto px-4 py-5">
          <p className="text-[11px] text-surface-400 leading-relaxed text-center">
            PriceBasket is India&apos;s #1 grocery price comparison platform. Compare prices on{" "}
            <Link href="/compare/blinkit-vs-zepto" className="hover:text-brand-600 underline underline-offset-2">Blinkit vs Zepto</Link>,{" "}
            <Link href="/compare/zepto-vs-instamart" className="hover:text-brand-600 underline underline-offset-2">Zepto vs Swiggy Instamart</Link>,{" "}
            <Link href="/compare/blinkit-vs-bigbasket" className="hover:text-brand-600 underline underline-offset-2">Blinkit vs BigBasket</Link>,{" "}
            <Link href="/compare/bigbasket-vs-jiomart" className="hover:text-brand-600 underline underline-offset-2">BigBasket vs JioMart</Link> and more.
            Find the cheapest grocery delivery app in Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune and all major Indian cities.
            Set free price alerts and save ₹500–₹2,000 every month on groceries.
          </p>
        </div>
      </div>

      {/* ── Black bottom bar ── */}
      <div className="bg-surface-900">
        <div className="max-w-screen-xl mx-auto px-4 py-5 pb-20 md:pb-5
                        flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

          <div className="flex flex-col gap-2">
            <p className="text-surface-400 text-xs">© Price Basket, 2024–2026 · All rights reserved.</p>
            <div className="flex items-center gap-4">
              {/* Instagram — official radial gradient + camera mark */}
              <a
                href="https://www.instagram.com/pricebasketindia/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 flex-shrink-0">
                  <defs>
                    {/* Radial gradient: yellow bottom-left → pink → purple top-right (official) */}
                    <radialGradient id="ig-rg" cx="30%" cy="107%" r="150%">
                      <stop offset="0%"   stopColor="#fdf497"/>
                      <stop offset="10%"  stopColor="#fdf497"/>
                      <stop offset="50%"  stopColor="#fd5949"/>
                      <stop offset="68%"  stopColor="#d6249f"/>
                      <stop offset="100%" stopColor="#285AEB"/>
                    </radialGradient>
                  </defs>
                  <rect width="24" height="24" rx="5.5" fill="url(#ig-rg)"/>
                  {/* Camera body */}
                  <rect x="4.5" y="4.5" width="15" height="15" rx="4" fill="none" stroke="white" strokeWidth="1.6"/>
                  {/* Lens ring */}
                  <circle cx="12" cy="12" r="3.5" fill="none" stroke="white" strokeWidth="1.6"/>
                  {/* Flash dot */}
                  <circle cx="17" cy="7" r="1.3" fill="white"/>
                </svg>
                <span className="text-surface-300">@pricebasketindia</span>
              </a>

              {/* WhatsApp — official green circle + speech-bubble phone mark */}
              <a
                href="https://wa.me/918005828390"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 flex-shrink-0">
                  {/* Green circle background — matches the real WhatsApp icon */}
                  <circle cx="12" cy="12" r="12" fill="#25D366"/>
                  {/* Official WhatsApp speech-bubble + phone mark */}
                  <path fill="white" d="
                    M12 4.25
                    C7.71 4.25 4.25 7.71 4.25 12
                    c0 1.62.49 3.13 1.33 4.38
                    L4.25 19.75 8.71 18.44
                    A7.74 7.74 0 0012 19.75
                    c4.29 0 7.75-3.46 7.75-7.75
                    S16.29 4.25 12 4.25z
                    M16.28 14.9
                    c-.18.5-.88.92-1.45 1.04
                    -.38.08-.88.14-2.56-.55
                    -2.15-.88-3.54-3.07-3.65-3.21
                    -.11-.14-.89-1.18-.89-2.25
                    0-1.07.56-1.6.76-1.82
                    .2-.22.43-.27.57-.27
                    h.4c.13 0 .31-.05.49.37
                    .18.43.62 1.51.67 1.62
                    .05.11.09.24.02.38
                    -.07.14-.11.23-.22.35
                    -.11.12-.23.27-.32.36
                    -.11.1-.22.22-.1.43
                    .13.21.55.91 1.19 1.47
                    .82.73 1.5.95 1.71 1.06
                    .22.11.34.09.47-.05
                    .13-.14.54-.63.68-.85
                    .14-.22.29-.18.49-.11
                    .2.07 1.25.59 1.46.7
                    .21.11.35.16.41.25
                    .05.09.05.52-.13 1.02z
                  "/>
                </svg>
                <span className="text-surface-300">WhatsApp</span>
              </a>

              {/* YouTube — official red rounded-rect + play mark */}
              <a
                href="https://www.youtube.com/@pricebasketindia/shorts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 flex-shrink-0">
                  {/* Official YouTube red pill shape */}
                  <path fill="#FF0000" d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 00.502 6.19C0 8.07 0 12 0 12s0 3.93.502 5.81a3.02 3.02 0 002.121 2.136C4.495 20.455 12 20.455 12 20.455s7.505 0 9.377-.509a3.02 3.02 0 002.121-2.136C24 15.93 24 12 24 12s0-3.93-.5-5.81z"/>
                  {/* White play triangle */}
                  <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="text-surface-300">YouTube</span>
              </a>
            </div>
          </div>

          <p className="text-surface-500 text-xs leading-relaxed sm:text-right sm:max-w-md">
            Prices are sourced in real-time from partner platforms. Price Basket does not sell products directly.
            Always verify the final price on the respective platform before purchasing.
          </p>

        </div>
      </div>

    </footer>
  );
}
