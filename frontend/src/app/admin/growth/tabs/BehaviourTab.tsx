"use client";
import { Smartphone, Monitor, Tablet } from "lucide-react";
import type { TopPage } from "../GrowthData";

interface BehaviourTabProps {
  topPages?: TopPage[];
  topSearches?: string[];
  loading?: boolean;
}

export function BehaviourTab({ topPages = [], topSearches = [], loading = false }: BehaviourTabProps) {
  return (
    <div className="space-y-6">
      {/* Top pages */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Top Pages by Views — Live from DB
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Page</th>
                <th className="pb-2 pr-4 text-right">Views</th>
                <th className="pb-2 pr-4 text-right">Avg Time</th>
                <th className="pb-2 text-right">Bounce</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-50">
                    <td className="py-2.5 pr-4"><div className="h-4 w-4 bg-surface-100 rounded animate-pulse" /></td>
                    <td className="py-2.5 pr-4"><div className="h-4 w-48 bg-surface-100 rounded animate-pulse" /></td>
                    <td className="py-2.5 pr-4"><div className="h-4 w-12 bg-surface-100 rounded animate-pulse ml-auto" /></td>
                    <td className="py-2.5 pr-4"><div className="h-4 w-12 bg-surface-100 rounded animate-pulse ml-auto" /></td>
                    <td className="py-2.5"><div className="h-4 w-10 bg-surface-100 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : topPages.length > 0 ? (
                topPages.map((p, i) => (
                  <tr key={p.page} className="border-b border-surface-50 last:border-0 hover:bg-surface-50">
                    <td className="py-2.5 pr-4 text-xs font-bold text-surface-400">{i + 1}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-sm font-medium text-surface-800 font-mono">{p.page}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-surface-900">
                      {p.views.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-surface-600">
                      {p.avg_time > 0 ? `${Math.floor(p.avg_time / 60)}m ${p.avg_time % 60}s` : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {p.bounce > 0 ? (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${p.bounce <= 20 ? "bg-green-50 text-green-700" : p.bounce <= 35 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                          {p.bounce}%
                        </span>
                      ) : <span className="text-xs text-surface-400">—</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-surface-400">
                    No page view data yet — events will appear as users browse the site
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Device breakdown */}
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Device Breakdown</p>
          <div className="space-y-3">
            {[
              { type: "Mobile", pct: 78, color: "bg-brand-600", icon: Smartphone },
              { type: "Desktop", pct: 18, color: "bg-blue-500", icon: Monitor },
              { type: "Tablet", pct: 4, color: "bg-violet-500", icon: Tablet },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.type} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-sm text-surface-700 w-16 flex-shrink-0">{d.type}</span>
                  <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-surface-900 w-10 text-right flex-shrink-0">{d.pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-surface-400 mt-3">Connect GA4 for real device breakdown data</p>
        </div>

        {/* Top site searches — real from DB */}
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
            Top Site Searches — Live from DB
          </p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-24 bg-surface-100 rounded-full animate-pulse" />
              ))}
            </div>
          ) : topSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topSearches.map((q) => (
                <span key={q} className="text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full border border-brand-100">
                  🔍 {q}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-400 py-4 text-center">
              No search data yet — searches will appear as users use the search bar
            </p>
          )}
        </div>
      </div>

      {/* User journey */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Most Common User Journey
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { step: "1", label: "Homepage", sub: "Entry point", color: "bg-brand-600" },
            { step: "2", label: "Search", sub: "Product lookup", color: "bg-blue-500" },
            { step: "3", label: "Product Page", sub: "Price compare", color: "bg-violet-500" },
            { step: "4", label: "Compare", sub: "Platform select", color: "bg-amber-500" },
            { step: "5", label: "Platform Click", sub: "Conversion", color: "bg-green-500" },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-2 flex-shrink-0">
              <div className="text-center">
                <div className={`w-10 h-10 rounded-full ${s.color} text-white flex items-center justify-center text-sm font-black mx-auto`}>
                  {s.step}
                </div>
                <p className="text-xs font-semibold text-surface-800 mt-1 whitespace-nowrap">{s.label}</p>
                <p className="text-xs text-surface-400 whitespace-nowrap">{s.sub}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="text-surface-300 text-lg font-bold flex-shrink-0">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Exit pages */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Top Exit Pages (Opportunity to Improve)
        </p>
        <div className="space-y-2">
          {[
            { page: "/auth/login", exits: "—", reason: "Friction in signup flow" },
            { page: "/cart", exits: "—", reason: "No guest checkout option" },
            { page: "/product/[id]", exits: "—", reason: "Price not compelling enough" },
            { page: "/search (no results)", exits: "—", reason: "Product not in catalog" },
          ].map((e) => (
            <div key={e.page} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div>
                <p className="text-xs font-semibold text-surface-800 font-mono">{e.page}</p>
                <p className="text-xs text-surface-500 mt-0.5">💡 {e.reason}</p>
              </div>
              <span className="text-sm font-black text-red-700 flex-shrink-0">{e.exits} exits</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-400 mt-3">Connect GA4 for real exit page data</p>
      </div>
    </div>
  );
}
