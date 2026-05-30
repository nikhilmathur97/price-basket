import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SEO Health Dashboard — PriceBasket Admin",
  robots: { index: false, follow: false },
};

// ── All SEO pages to audit ────────────────────────────────────────────────────
const SEO_PAGES = [
  // Core
  { url: "/",                          title: "Homepage",                    priority: "P0", searches: "Brand" },
  { url: "/search",                    title: "Search",                      priority: "P0", searches: "~50K" },
  { url: "/blog",                      title: "Blog",                        priority: "P1", searches: "~5K" },
  // Compare pages
  { url: "/compare/blinkit-vs-zepto",  title: "Blinkit vs Zepto",           priority: "P0", searches: "90K/mo" },
  { url: "/compare/zepto-vs-instamart",title: "Zepto vs Instamart",         priority: "P0", searches: "40K/mo" },
  { url: "/compare/blinkit-vs-bigbasket",title:"Blinkit vs BigBasket",      priority: "P0", searches: "25K/mo" },
  { url: "/compare/bigbasket-vs-jiomart",title:"BigBasket vs JioMart",      priority: "P1", searches: "18K/mo" },
  // Product SEO
  { url: "/best-grocery-deals",        title: "Best Grocery Deals",          priority: "P0", searches: "30K/mo" },
  { url: "/save-money-groceries",      title: "Save Money Groceries",        priority: "P0", searches: "22K/mo" },
  { url: "/cheapest-atta-online",      title: "Cheapest Atta Online",        priority: "P1", searches: "15K/mo" },
  { url: "/cheapest-rice-online",      title: "Cheapest Rice Online",        priority: "P1", searches: "12K/mo" },
  { url: "/cheapest-oil-online",       title: "Cheapest Oil Online",         priority: "P1", searches: "10K/mo" },
  { url: "/cheapest-milk-online",      title: "Cheapest Milk Online",        priority: "P1", searches: "8K/mo" },
  { url: "/cheapest-dal-online",       title: "Cheapest Dal Online",         priority: "P1", searches: "8K/mo" },
  { url: "/cheapest-sugar-online",     title: "Cheapest Sugar Online",       priority: "P1", searches: "12K/mo" },
  { url: "/cheapest-ghee-online",      title: "Cheapest Ghee Online",        priority: "P1", searches: "18K/mo" },
  { url: "/cheapest-eggs-online",      title: "Cheapest Eggs Online",        priority: "P1", searches: "15K/mo" },
  // City pages
  { url: "/grocery-prices-mumbai",     title: "Grocery Prices Mumbai",       priority: "P1", searches: "12K/mo" },
  { url: "/grocery-prices-delhi",      title: "Grocery Prices Delhi",        priority: "P1", searches: "10K/mo" },
  { url: "/grocery-prices-bangalore",  title: "Grocery Prices Bangalore",    priority: "P1", searches: "9K/mo" },
  { url: "/grocery-prices-hyderabad",  title: "Grocery Prices Hyderabad",    priority: "P2", searches: "6K/mo" },
  { url: "/grocery-prices-chennai",    title: "Grocery Prices Chennai",      priority: "P2", searches: "5K/mo" },
  { url: "/grocery-prices-pune",       title: "Grocery Prices Pune",         priority: "P2", searches: "5K/mo" },
  { url: "/grocery-prices-kolkata",    title: "Grocery Prices Kolkata",      priority: "P2", searches: "4K/mo" },
  { url: "/grocery-prices-ahmedabad",  title: "Grocery Prices Ahmedabad",    priority: "P2", searches: "4K/mo" },
];

const SETUP_CHECKLIST = [
  {
    id: "gsc",
    title: "Google Search Console",
    desc: "Verify pricebasket.in ownership → submit sitemap → monitor indexing",
    steps: [
      "Go to search.google.com/search-console",
      "Add property: pricebasket.in",
      "Choose HTML tag verification method",
      "Copy the content= value",
      "Set NEXT_PUBLIC_GSC_VERIFICATION=<value> in Vercel env vars",
      "Redeploy → verify",
      "Go to Sitemaps → submit https://pricebasket.in/sitemap.xml",
    ],
    link: "https://search.google.com/search-console",
    linkLabel: "Open GSC →",
    done: false,
  },
  {
    id: "ga4",
    title: "Google Analytics 4",
    desc: "Track organic traffic, user behaviour, conversions",
    steps: [
      "Go to analytics.google.com",
      "Create property for pricebasket.in",
      "Get Measurement ID (format: G-XXXXXXXXXX)",
      "Set NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX in Vercel env vars",
      "Redeploy → verify in GA4 Realtime report",
    ],
    link: "https://analytics.google.com",
    linkLabel: "Open GA4 →",
    done: false,
  },
  {
    id: "indexnow",
    title: "IndexNow (Instant Indexing)",
    desc: "Notify Google, Bing, Yandex instantly when pages are published",
    steps: [
      "Generate key: python -c \"import uuid; print(uuid.uuid4().hex)\"",
      "Set INDEXNOW_KEY=<key> in Vercel env vars",
      "Set INDEXNOW_PING_TOKEN=<secret> in Vercel env vars",
      "Create /public/<key>.txt containing just the key",
      "After deploy: GET https://pricebasket.in/api/indexnow?token=<secret>",
    ],
    link: "/api/indexnow",
    linkLabel: "Ping Now →",
    done: false,
  },
  {
    id: "bing",
    title: "Bing Webmaster Tools",
    desc: "Bing has 6% India search share — worth 5 minutes to set up",
    steps: [
      "Go to bing.com/webmasters",
      "Import from Google Search Console (1-click if GSC is done)",
      "Submit sitemap: https://pricebasket.in/sitemap.xml",
    ],
    link: "https://www.bing.com/webmasters",
    linkLabel: "Open Bing WMT →",
    done: false,
  },
  {
    id: "pagespeed",
    title: "Core Web Vitals",
    desc: "Google uses CWV as a ranking signal. Target: LCP < 2.5s, CLS < 0.1, FID < 100ms",
    steps: [
      "Run PageSpeed Insights on homepage",
      "Run on /compare/blinkit-vs-zepto (most traffic)",
      "Fix any LCP issues (usually large images)",
      "Fix any CLS issues (usually layout shifts on load)",
    ],
    link: "https://pagespeed.web.dev/analysis?url=https://pricebasket.in",
    linkLabel: "Run PageSpeed →",
    done: false,
  },
  {
    id: "schema",
    title: "Rich Results Test",
    desc: "Verify JSON-LD structured data is valid for rich snippets",
    steps: [
      "Test homepage FAQ schema",
      "Test a compare page FAQ schema",
      "Test a product page Product schema",
      "Fix any errors shown",
    ],
    link: "https://search.google.com/test/rich-results?url=https://pricebasket.in",
    linkLabel: "Test Rich Results →",
    done: false,
  },
];

const METRICS_TO_TRACK = [
  {
    metric: "Organic Clicks",
    where: "Google Search Console → Performance",
    target: "100/day in 30 days, 1000/day in 90 days",
    frequency: "Weekly",
  },
  {
    metric: "Indexed Pages",
    where: "GSC → Coverage → Valid",
    target: "All 43+ SEO pages indexed within 2 weeks",
    frequency: "Weekly",
  },
  {
    metric: "Average Position",
    where: "GSC → Performance → Queries",
    target: "Top 10 for 'blinkit vs zepto' within 60 days",
    frequency: "Weekly",
  },
  {
    metric: "Core Web Vitals",
    where: "GSC → Core Web Vitals OR PageSpeed Insights",
    target: "All pages: Good (green)",
    frequency: "Monthly",
  },
  {
    metric: "Organic Sessions",
    where: "GA4 → Acquisition → Organic Search",
    target: "500/month in 30 days, 5000/month in 90 days",
    frequency: "Weekly",
  },
  {
    metric: "Click-Through Rate",
    where: "GSC → Performance → Pages",
    target: "> 3% average CTR",
    frequency: "Monthly",
  },
  {
    metric: "Rich Results",
    where: "GSC → Search Appearance → Rich Results",
    target: "FAQ snippets showing for compare + product pages",
    frequency: "Monthly",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-700 border-red-200",
  P1: "bg-orange-100 text-orange-700 border-orange-200",
  P2: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function SeoHealthPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
              Admin — SEO Health
            </p>
            <h1 className="text-2xl font-black text-surface-900 mb-2">
              PriceBasket SEO Dashboard
            </h1>
            <p className="text-sm text-surface-500">
              Track your SEO setup, measure progress, and know exactly what to do next.
            </p>
          </div>
          <Link
            href="/admin/seo/validate"
            className="flex-shrink-0 bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl
                       text-sm hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            🔍 Run SEO Validator
          </Link>
        </div>

        {/* ── Quick status ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "SEO Pages Live",    value: "43+",  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
            { label: "Monthly Searches",  value: "500K+", color: "text-brand-600", bg: "bg-brand-50",  border: "border-brand-200" },
            { label: "JSON-LD Schemas",   value: "7",    color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
            { label: "Setup Steps Left",  value: "6",    color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs font-semibold text-surface-600 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Setup checklist ── */}
        <section className="mb-8">
          <h2 className="text-lg font-extrabold text-surface-900 mb-4">
            🔧 Setup Checklist — Do These First
          </h2>
          <div className="space-y-3">
            {SETUP_CHECKLIST.map((item, i) => (
              <div key={item.id} className="bg-white rounded-2xl border border-surface-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-7 h-7 rounded-full bg-surface-100 border-2 border-surface-200
                                    flex items-center justify-center text-xs font-black text-surface-500 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-surface-900 text-sm mb-1">{item.title}</p>
                      <p className="text-[12px] text-surface-500 mb-3">{item.desc}</p>
                      <ol className="space-y-1">
                        {item.steps.map((step, j) => (
                          <li key={j} className="text-[12px] text-surface-600 flex items-start gap-2">
                            <span className="text-surface-400 font-bold flex-shrink-0">{j + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <a
                    href={item.link}
                    target={item.link.startsWith("http") ? "_blank" : undefined}
                    rel={item.link.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex-shrink-0 text-[11px] font-bold text-brand-600 bg-brand-50
                               border border-brand-100 px-3 py-1.5 rounded-xl hover:bg-brand-100
                               transition-colors whitespace-nowrap"
                  >
                    {item.linkLabel}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Metrics to track ── */}
        <section className="mb-8">
          <h2 className="text-lg font-extrabold text-surface-900 mb-4">
            📊 Metrics to Track Weekly
          </h2>
          <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Where to Find</th>
                  <th className="px-4 py-3 hidden md:table-cell">Target</th>
                  <th className="px-4 py-3">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {METRICS_TO_TRACK.map((m, i) => (
                  <tr key={m.metric} className={`border-b border-surface-50 last:border-0 ${i % 2 === 0 ? "" : "bg-surface-50/50"}`}>
                    <td className="px-4 py-3 font-semibold text-surface-900">{m.metric}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs hidden sm:table-cell">{m.where}</td>
                    <td className="px-4 py-3 text-surface-600 text-xs hidden md:table-cell">{m.target}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full">
                        {m.frequency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── All SEO pages ── */}
        <section className="mb-8">
          <h2 className="text-lg font-extrabold text-surface-900 mb-4">
            🗂️ All SEO Pages ({SEO_PAGES.length} shown)
          </h2>
          <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3">Page</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Monthly Searches</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {SEO_PAGES.map((page) => (
                  <tr key={page.url} className="border-b border-surface-50 last:border-0 hover:bg-surface-50">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-surface-900 text-xs">{page.title}</p>
                      <p className="text-[11px] text-surface-400">{page.url}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${PRIORITY_COLORS[page.priority]}`}>
                        {page.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-surface-500 hidden sm:table-cell">
                      {page.searches}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        <Link href={page.url} target="_blank"
                          className="text-[10px] font-bold text-brand-600 hover:text-brand-700">
                          View →
                        </Link>
                        <a
                          href={`https://search.google.com/test/rich-results?url=https://pricebasket.in${page.url}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-bold text-purple-600 hover:text-purple-700">
                          Test →
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Quick links ── */}
        <section className="mb-8">
          <h2 className="text-lg font-extrabold text-surface-900 mb-4">
            🔗 Quick Links
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Google Search Console",    href: "https://search.google.com/search-console",                                    emoji: "🔍" },
              { label: "Google Analytics 4",       href: "https://analytics.google.com",                                                emoji: "📊" },
              { label: "PageSpeed Insights",       href: "https://pagespeed.web.dev/analysis?url=https://pricebasket.in",               emoji: "⚡" },
              { label: "Rich Results Test",        href: "https://search.google.com/test/rich-results?url=https://pricebasket.in",      emoji: "✨" },
              { label: "Bing Webmaster Tools",     href: "https://www.bing.com/webmasters",                                             emoji: "🔷" },
              { label: "View Sitemap",             href: "https://pricebasket.in/sitemap.xml",                                          emoji: "🗺️" },
              { label: "Ping IndexNow",            href: "/api/indexnow",                                                               emoji: "📡" },
              { label: "Schema Markup Validator",  href: "https://validator.schema.org/#url=https://pricebasket.in",                    emoji: "🧪" },
              { label: "Ahrefs Free Checker",      href: "https://ahrefs.com/backlink-checker?input=pricebasket.in&mode=domain",        emoji: "🔗" },
            ].map((l) => (
              <a key={l.href} href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="bg-white rounded-xl border border-surface-100 p-4
                           hover:border-brand-300 hover:shadow-md transition-all
                           flex items-center gap-3 group">
                <span className="text-xl">{l.emoji}</span>
                <span className="text-sm font-semibold text-surface-700 group-hover:text-brand-600">
                  {l.label}
                </span>
                <span className="ml-auto text-brand-400 text-xs">→</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="mb-8">
          <h2 className="text-lg font-extrabold text-surface-900 mb-4">
            📅 Expected SEO Timeline
          </h2>
          <div className="space-y-3">
            {[
              {
                period: "Week 1–2",
                color: "bg-blue-500",
                items: [
                  "Google crawls and indexes all 43+ pages",
                  "Rich snippets (FAQ) start appearing in search results",
                  "GSC shows first impressions data",
                ],
              },
              {
                period: "Month 1",
                color: "bg-brand-500",
                items: [
                  "100–500 organic clicks/day from long-tail keywords",
                  "Compare pages rank for 'blinkit vs zepto' type queries",
                  "City pages rank for 'grocery prices [city]' queries",
                ],
              },
              {
                period: "Month 2–3",
                color: "bg-green-500",
                items: [
                  "1,000–5,000 organic clicks/day",
                  "Top 10 rankings for primary keywords",
                  "Featured snippets for FAQ content",
                  "Significant organic traffic from staple product pages",
                ],
              },
              {
                period: "Month 6+",
                color: "bg-purple-500",
                items: [
                  "10,000+ organic clicks/day",
                  "Brand searches growing (people searching 'pricebasket')",
                  "Backlinks from deal/savings blogs",
                  "Dominant rankings for all compare keywords",
                ],
              },
            ].map((t) => (
              <div key={t.period} className="bg-white rounded-2xl border border-surface-100 p-5 flex gap-4">
                <div className={`w-2 rounded-full flex-shrink-0 ${t.color}`} />
                <div>
                  <p className="font-extrabold text-surface-900 text-sm mb-2">{t.period}</p>
                  <ul className="space-y-1">
                    {t.items.map((item) => (
                      <li key={item} className="text-[13px] text-surface-600 flex items-start gap-2">
                        <span className="text-green-500 flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link href="/admin/growth" className="text-sm text-brand-600 hover:underline">
            ← Back to Growth Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
