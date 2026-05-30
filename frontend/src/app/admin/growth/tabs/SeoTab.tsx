"use client";
import { useGoogleMetrics } from "../GrowthData";
import { Globe, Search, Eye, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

function PosBadge({ pos, prev }: { pos: number; prev: number }) {
  const delta = prev - pos;
  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-black ${pos <= 3 ? "text-green-700" : pos <= 10 ? "text-amber-700" : "text-red-600"}`}>
        #{pos}
      </span>
      {delta !== 0 && (
        <span className={`text-xs font-semibold flex items-center ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
          {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

export function SeoTab({ days = 7 }: { days?: number }) {
  const { data, loading } = useGoogleMetrics(days);

  const gsc = data?.gsc ?? {};
  const psi = data?.pagespeed ?? {};
  const keywords = gsc.keywords ?? [];
  const configured = data?.credentials_configured ?? false;

  // Summary KPIs
  const kpis = [
    {
      label: "Total Clicks (GSC)",
      value: gsc.total_clicks != null ? gsc.total_clicks.toLocaleString("en-IN") : "—",
      icon: ArrowUpRight, color: "bg-brand-50 text-brand-700",
    },
    {
      label: "Total Impressions",
      value: gsc.total_impressions != null ? gsc.total_impressions.toLocaleString("en-IN") : "—",
      icon: Eye, color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Avg Position",
      value: gsc.avg_position != null ? `#${gsc.avg_position}` : "—",
      icon: Search, color: "bg-blue-50 text-blue-700",
    },
    {
      label: "PageSpeed Score",
      value: psi.performance_score != null ? `${psi.performance_score}/100` : "—",
      icon: Globe,
      color: psi.performance_score >= 90 ? "bg-green-50 text-green-700"
           : psi.performance_score >= 50 ? "bg-amber-50 text-amber-700"
           : "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Phase 2 not yet configured.</strong> Set{" "}
          <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_FILE</code>,{" "}
          <code className="bg-amber-100 px-1 rounded">GA4_PROPERTY_ID</code>, and{" "}
          <code className="bg-amber-100 px-1 rounded">GSC_SITE_URL</code> env vars.
          See <code className="bg-amber-100 px-1 rounded">growth/automation/master-guide.md</code>.
          PageSpeed data loads without credentials.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{k.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-surface-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-surface-900">{k.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Keywords table */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          {configured ? "Top Keywords — Google Search Console" : "Top Keywords — Sample Data (configure GSC for live data)"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100">
                <th className="pb-2 pr-4">Keyword</th>
                <th className="pb-2 pr-4 text-center">Position</th>
                <th className="pb-2 pr-4 text-right">Clicks</th>
                <th className="pb-2 pr-4 text-right">Impressions</th>
                <th className="pb-2 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-50">
                    <td className="py-2.5 pr-4"><div className="h-4 w-48 bg-surface-100 rounded animate-pulse" /></td>
                    <td className="py-2.5 pr-4"><div className="h-4 w-8 bg-surface-100 rounded animate-pulse mx-auto" /></td>
                    <td className="py-2.5 pr-4"><div className="h-4 w-12 bg-surface-100 rounded animate-pulse ml-auto" /></td>
                    <td className="py-2.5 pr-4"><div className="h-4 w-16 bg-surface-100 rounded animate-pulse ml-auto" /></td>
                    <td className="py-2.5"><div className="h-4 w-10 bg-surface-100 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : keywords.length > 0 ? keywords.map((kw: any) => (
                <tr key={kw.keyword} className="border-b border-surface-50 last:border-0 hover:bg-surface-50">
                  <td className="py-2.5 pr-4">
                    <span className="text-sm font-medium text-surface-800">{kw.keyword}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <PosBadge pos={Math.round(kw.position)} prev={Math.round(kw.prev)} />
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-surface-900">{kw.clicks.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 pr-4 text-right text-surface-600">{kw.impressions.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 text-right">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${kw.ctr >= 5 ? "bg-green-50 text-green-700" : kw.ctr >= 3 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                      {kw.ctr}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-surface-400">
                    No keyword data yet — configure Google Search Console to see rankings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">
            Core Web Vitals {psi.source === "pagespeed" ? "— Live from PageSpeed API" : ""}
          </p>
          <div className="space-y-3">
            {[
              { metric: "LCP (Largest Contentful Paint)", value: psi.lcp ?? "—", target: "< 2.5s", pass: psi.lcp ? !psi.lcp.includes("s") || parseFloat(psi.lcp) < 2.5 : null },
              { metric: "CLS (Cumulative Layout Shift)", value: psi.cls ?? "—", target: "< 0.1", pass: psi.cls ? parseFloat(psi.cls) < 0.1 : null },
              { metric: "INP (Interaction to Next Paint)", value: psi.inp ?? "—", target: "< 200ms", pass: psi.inp ? parseInt(psi.inp) < 200 : null },
              { metric: "TTFB (Time to First Byte)", value: psi.ttfb ?? "—", target: "< 600ms", pass: psi.ttfb ? parseInt(psi.ttfb) < 600 : null },
            ].map((v) => (
              <div key={v.metric} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-surface-700">{v.metric}</p>
                  <p className="text-xs text-surface-400">Target: {v.target}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-surface-900">{loading ? "…" : v.value}</span>
                  {v.pass !== null && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${v.pass ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {v.pass ? "✓ PASS" : "✗ FAIL"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">SEO Quick Actions</p>
          <div className="space-y-2">
            {[
              { action: "Submit sitemap to Google Search Console", href: "https://search.google.com/search-console", done: configured },
              { action: "Check PageSpeed score (mobile)", href: `https://pagespeed.web.dev/report?url=https://pricebasket.in`, done: !!psi.performance_score },
              { action: "Set up GA4 property", href: "https://analytics.google.com", done: !!data?.ga4?.sessions },
              { action: "Enable Google Indexing API", href: "https://console.cloud.google.com", done: false },
              { action: "Submit to Google Shopping Feed", href: "https://merchants.google.com", done: false },
            ].map((item) => (
              <div key={item.action} className="flex items-center justify-between p-2.5 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${item.done ? "bg-green-500 text-white" : "bg-surface-200 text-surface-400"}`}>
                    {item.done ? "✓" : "○"}
                  </span>
                  <span className="text-xs font-medium text-surface-700">{item.action}</span>
                </div>
                <a href={item.href} target="_blank" rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 flex-shrink-0 ml-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
