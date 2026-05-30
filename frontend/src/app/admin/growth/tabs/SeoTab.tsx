"use client";
import { Globe, Search, Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { SEO_KEYWORDS } from "../GrowthData";

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

export function SeoTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Indexed Pages", value: "284", icon: Globe, color: "bg-green-50 text-green-700" },
          { label: "Avg Position", value: "3.2", icon: Search, color: "bg-blue-50 text-blue-700" },
          { label: "Total Clicks (GSC)", value: "18,420", icon: ArrowUpRight, color: "bg-brand-50 text-brand-700" },
          { label: "Total Impressions", value: "2,84,000", icon: Eye, color: "bg-violet-50 text-violet-700" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{k.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-surface-900">{k.value}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Top 10 Keywords — Current Rankings
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100">
                <th className="pb-2 pr-4">Keyword</th>
                <th className="pb-2 pr-4 text-center">Position</th>
                <th className="pb-2 pr-4 text-right">Volume</th>
                <th className="pb-2 pr-4 text-right">Clicks</th>
                <th className="pb-2 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {SEO_KEYWORDS.map((kw) => (
                <tr key={kw.keyword} className="border-b border-surface-50 last:border-0 hover:bg-surface-50">
                  <td className="py-2.5 pr-4">
                    <span className="text-sm font-medium text-surface-800">{kw.keyword}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-center">
                    <PosBadge pos={kw.position} prev={kw.prev} />
                  </td>
                  <td className="py-2.5 pr-4 text-right text-surface-600">{kw.volume.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-surface-900">{kw.clicks.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 text-right">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${kw.ctr >= 5 ? "bg-green-50 text-green-700" : kw.ctr >= 3 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                      {kw.ctr}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">Core Web Vitals</p>
          <div className="space-y-3">
            {[
              { metric: "LCP (Largest Contentful Paint)", value: "1.8s", target: "< 2.5s", pass: true },
              { metric: "CLS (Cumulative Layout Shift)", value: "0.04", target: "< 0.1", pass: true },
              { metric: "INP (Interaction to Next Paint)", value: "142ms", target: "< 200ms", pass: true },
              { metric: "TTFB (Time to First Byte)", value: "380ms", target: "< 600ms", pass: true },
            ].map((v) => (
              <div key={v.metric} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-surface-700">{v.metric}</p>
                  <p className="text-xs text-surface-400">Target: {v.target}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-surface-900">{v.value}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${v.pass ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {v.pass ? "✓ PASS" : "✗ FAIL"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">Blog Performance</p>
          <div className="space-y-2">
            {[
              { title: "Blinkit vs Zepto: Full Price Comparison 2025", views: 4820, time: "4m 12s" },
              { title: "How to Save ₹800/Month on Groceries", views: 3240, time: "5m 38s" },
              { title: "Best Grocery Deals This Week in Delhi", views: 2180, time: "3m 22s" },
              { title: "Zepto vs BigBasket: Which is Cheaper?", views: 1940, time: "4m 48s" },
            ].map((b) => (
              <div key={b.title} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
                <p className="text-xs font-medium text-surface-700 truncate max-w-[200px]">{b.title}</p>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-surface-500">{b.views.toLocaleString()} views</span>
                  <span className="text-xs font-semibold text-brand-600">{b.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
