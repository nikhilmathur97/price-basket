"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Eye,
  ShoppingCart,
  ArrowUpRight,
  Search,
  Users,
  TrendingUp,
  Store,
} from "lucide-react";

interface AnalyticsStats {
  period_days: number;
  unique_clients: number;
  unique_registered_users: number;
  event_counts: Record<string, number>;
  funnel: {
    product_views: number;
    cart_adds: number;
    platform_redirects: number;
  };
  top_viewed_products: { product_id: string; name: string; brand: string; views: number }[];
  top_platform_redirects: {
    product_id: string;
    platform_id: string;
    product_name: string;
    platform_name: string;
    redirects: number;
    avg_price: number | null;
  }[];
  platform_clicks: { platform: string; clicks: number }[];
}

const PERIOD_OPTIONS = [
  { label: "24 h", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
];

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery<AnalyticsStats>({
    queryKey: ["analytics-stats", days],
    queryFn: async () => (await api.getAnalyticsStats(days)).data,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 h-24 animate-pulse bg-surface-50" />
        ))}
      </div>
    );
  }

  const f = data?.funnel ?? { product_views: 0, cart_adds: 0, platform_redirects: 0 };
  const ec = data?.event_counts ?? {};

  return (
    <div className="space-y-6">
      {/* ── Period selector ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-surface-900">Behavior Analytics</h2>
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                days === o.value
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reach KPIs ──────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Unique Visitors",
            value: data?.unique_clients ?? 0,
            icon: Users,
            tone: "bg-blue-50 text-blue-700",
          },
          {
            label: "Logged-in Users",
            value: data?.unique_registered_users ?? 0,
            icon: Users,
            tone: "bg-violet-50 text-violet-700",
          },
          {
            label: "Product Views",
            value: f.product_views,
            icon: Eye,
            tone: "bg-amber-50 text-amber-700",
          },
          {
            label: "Searches",
            value: ec.search ?? 0,
            icon: Search,
            tone: "bg-sky-50 text-sky-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-surface-500">{card.label}</p>
                  <p className="text-3xl font-black text-surface-900 mt-1">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Conversion funnel ───────────────────────────────────── */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Conversion Funnel — last {days} day{days > 1 ? "s" : ""}
        </p>
        <div className="space-y-3">
          {[
            { label: "Product views", count: f.product_views, icon: Eye, color: "bg-brand-600" },
            {
              label: "Add to cart",
              count: f.cart_adds,
              icon: ShoppingCart,
              color: "bg-amber-500",
              drop: pct(f.cart_adds, f.product_views),
            },
            {
              label: "Platform redirects",
              count: f.platform_redirects,
              icon: ArrowUpRight,
              color: "bg-green-600",
              drop: pct(f.platform_redirects, f.product_views),
            },
          ].map((step) => {
            const Icon = step.icon;
            const pctWidth =
              f.product_views > 0
                ? Math.max(6, (step.count / f.product_views) * 100)
                : 6;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center
                               text-white ${step.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-surface-700">{step.label}</span>
                    <span className="text-sm font-bold text-surface-900">
                      {step.count.toLocaleString()}
                      {"drop" in step && (
                        <span className="ml-1 text-xs font-normal text-surface-400">
                          ({step.drop} of views)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${step.color}`}
                      style={{ width: `${pctWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Platform clicks breakdown ──────────────────────────── */}
      {(data?.platform_clicks?.length ?? 0) > 0 && (
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
            Platform Click-throughs
          </p>
          <div className="space-y-2">
            {data!.platform_clicks.map((row) => {
              const maxClicks = Math.max(...data!.platform_clicks.map((r) => r.clicks));
              const barPct = maxClicks > 0 ? Math.max(6, (row.clicks / maxClicks) * 100) : 6;
              return (
                <div
                  key={row.platform}
                  className="grid grid-cols-[120px_1fr_60px] items-center gap-3"
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-surface-700 truncate">
                      {row.platform}
                    </span>
                  </div>
                  <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-surface-900 text-right">
                    {row.clicks}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top viewed products ─────────────────────────────────── */}
      {(data?.top_viewed_products?.length ?? 0) > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <p className="text-sm font-bold text-surface-800">Top Viewed Products</p>
          </div>
          <div className="space-y-2">
            {data!.top_viewed_products.map((row, i) => (
              <div
                key={row.product_id}
                className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0"
              >
                <span className="w-5 text-xs font-bold text-surface-400 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900 truncate">{row.name}</p>
                  {row.brand && (
                    <p className="text-xs text-surface-400">{row.brand}</p>
                  )}
                </div>
                <span className="flex items-center gap-1 text-sm font-bold text-surface-700 flex-shrink-0">
                  <Eye className="w-3.5 h-3.5 text-surface-400" />
                  {row.views.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top platform redirects ──────────────────────────────── */}
      {(data?.top_platform_redirects?.length ?? 0) > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="w-4 h-4 text-green-600" />
            <p className="text-sm font-bold text-surface-800">Top Platform Redirects</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4">Platform</th>
                  <th className="pb-2 pr-4 text-right">Clicks</th>
                  <th className="pb-2 text-right">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {data!.top_platform_redirects.map((row, i) => (
                  <tr
                    key={`${row.product_id}-${row.platform_id}`}
                    className="border-b border-surface-50 last:border-0"
                  >
                    <td className="py-2 pr-4 text-surface-400 font-bold">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-surface-900 truncate max-w-[160px]">
                        {row.product_name}
                      </p>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold
                                       bg-surface-100 text-surface-700 px-2 py-0.5 rounded-full">
                        <Store className="w-2.5 h-2.5" />
                        {row.platform_name}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-bold text-surface-900">
                      {row.redirects}
                    </td>
                    <td className="py-2 text-right text-surface-600">
                      {row.avg_price != null ? `₹${row.avg_price}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no data yet */}
      {!isLoading && f.product_views === 0 && (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-surface-700">No events yet for this period</p>
          <p className="text-sm text-surface-400 mt-1">
            Events are recorded as users browse, search, and add products to cart.
          </p>
        </div>
      )}
    </div>
  );
}

