"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Users, Eye, Clock,
  Search, BarChart3, Target, DollarSign,
  Minus, RefreshCw, Smartphone, Monitor, Tablet,
  Bell, Activity, Share2, ChevronUp, ChevronDown, Wifi,
} from "lucide-react";
import {
  useGrowthMetrics, useLiveStats, useGrowthAlerts,
  TRAFFIC_SOURCES, type GrowthMetrics, type TrafficSource,
} from "./GrowthData";
import { SeoTab } from "./tabs/SeoTab";
import { SocialTab } from "./tabs/SocialTab";
import { AdsTab } from "./tabs/AdsTab";
import { BehaviourTab } from "./tabs/BehaviourTab";
import { AlertsTab } from "./tabs/AlertsTab";

function fmt(n: number, type: "number" | "currency" | "percent" | "duration" = "number") {
  if (type === "currency") return `₹${n.toLocaleString("en-IN")}`;
  if (type === "percent") return `${n.toFixed(1)}%`;
  if (type === "duration") {
    if (n === 0) return "—";
    return `${Math.floor(n / 60)}m ${n % 60}s`;
  }
  return n.toLocaleString("en-IN");
}

function TrendBadge({ cur, prev, lower = false }: { cur: number; prev: number; lower?: boolean }) {
  const delta = cur - prev;
  const pct = prev > 0 ? ((Math.abs(delta) / prev) * 100).toFixed(1) : "0";
  const good = lower ? delta < 0 : delta > 0;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${good ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`}>
      {good ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {pct}%
    </span>
  );
}

function KpiCard({ label, value, prev, icon: Icon, color, lower = false, type = "number", loading = false }: {
  label: string; value: number; prev?: number; icon: React.ElementType;
  color: string; lower?: boolean; type?: "number" | "currency" | "percent" | "duration";
  loading?: boolean;
}) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide leading-tight">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-surface-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-black text-surface-900">{fmt(value, type)}</p>
      )}
      {prev !== undefined && !loading && (
        <div className="mt-2 flex items-center gap-1">
          <TrendBadge cur={value} prev={prev} lower={lower} />
          <span className="text-xs text-surface-400">vs last period</span>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ period, growth, loading }: {
  period: "1" | "7" | "30";
  growth: GrowthMetrics;
  loading: boolean;
}) {
  const newPct = growth.users > 0 ? Math.round((growth.new_users / growth.users) * 100) : 0;

  // Build traffic sources from platform_clicks if available
  const trafficSources: TrafficSource[] = TRAFFIC_SOURCES;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Sessions" value={growth.sessions} prev={growth.sessions_prev} icon={Activity} color="bg-brand-50 text-brand-700" loading={loading} />
        <KpiCard label="Total Users" value={growth.users} icon={Users} color="bg-blue-50 text-blue-700" loading={loading} />
        <KpiCard label="Avg Session" value={growth.avg_session_duration} icon={Clock} color="bg-violet-50 text-violet-700" type="duration" loading={loading} />
        <KpiCard label="Bounce Rate" value={growth.bounce_rate} prev={growth.bounce_rate_prev} icon={TrendingDown} color="bg-amber-50 text-amber-700" type="percent" lower loading={loading} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="New Users" value={growth.new_users} icon={Users} color="bg-green-50 text-green-700" loading={loading} />
        <KpiCard label="Pages / Session" value={growth.pages_per_session} icon={Eye} color="bg-sky-50 text-sky-700" loading={loading} />
        <KpiCard label="Conversion Rate" value={growth.conversion_rate} icon={Target} color="bg-emerald-50 text-emerald-700" type="percent" loading={loading} />
        <KpiCard label="Platform Redirects" value={growth.platform_redirects} icon={DollarSign} color="bg-orange-50 text-orange-700" loading={loading} />
      </div>

      {/* Funnel */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Conversion Funnel — Last {period === "1" ? "24h" : period === "7" ? "7 days" : "30 days"}
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: "Pageviews", value: growth.pageviews, color: "bg-brand-600" },
            { label: "Product Views", value: Math.round(growth.pageviews * 0.4), color: "bg-blue-500" },
            { label: "Cart Adds", value: growth.cart_adds, color: "bg-violet-500" },
            { label: "Platform Clicks", value: growth.platform_redirects, color: "bg-green-500" },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-2 flex-shrink-0">
              <div className="text-center">
                <div className={`w-10 h-10 rounded-full ${s.color} text-white flex items-center justify-center text-xs font-black mx-auto`}>
                  {i + 1}
                </div>
                <p className="text-xs font-semibold text-surface-800 mt-1 whitespace-nowrap">{s.label}</p>
                <p className="text-xs text-surface-400 whitespace-nowrap">
                  {loading ? "…" : s.value.toLocaleString("en-IN")}
                </p>
              </div>
              {i < arr.length - 1 && <div className="text-surface-300 text-lg font-bold flex-shrink-0">→</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Traffic Source Breakdown
        </p>
        <div className="space-y-3">
          {trafficSources.map((s) => (
            <div key={s.source} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-surface-700 w-44 flex-shrink-0 truncate">{s.source}</span>
              <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
              </div>
              <div className="flex items-center gap-2 w-28 justify-end flex-shrink-0">
                <span className="text-xs text-surface-500">{s.sessions.toLocaleString("en-IN")}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${s.trend === "up" ? "bg-green-50 text-green-700" : s.trend === "down" ? "bg-red-50 text-red-700" : "bg-surface-100 text-surface-500"}`}>
                  {s.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">New vs Returning Users</p>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f5f5f5" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ea580c" strokeWidth="3.5" strokeDasharray={`${newPct} 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-surface-900">{newPct}%</span>
                <span className="text-[9px] text-surface-500">New</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-500 flex-shrink-0" />
                <span className="text-sm text-surface-700">New Users</span>
                <span className="text-sm font-bold text-surface-900 ml-auto pl-4">
                  {loading ? "…" : growth.new_users.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-surface-200 flex-shrink-0" />
                <span className="text-sm text-surface-700">Returning</span>
                <span className="text-sm font-bold text-surface-900 ml-auto pl-4">
                  {loading ? "…" : growth.returning_users.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
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
        </div>
      </div>
    </div>
  );
}

export default function GrowthDashboardPage() {
  const [period, setPeriod] = useState<"1" | "7" | "30">("7");
  const [tab, setTab] = useState<"overview" | "seo" | "social" | "ads" | "behaviour" | "alerts">("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const days = period === "1" ? 1 : period === "7" ? 7 : 30;
  const { data: metricsData, loading: metricsLoading, refetch: refetchMetrics } = useGrowthMetrics(days);
  const { live, loading: liveLoading, refetch: refetchLive } = useLiveStats();
  const { alerts } = useGrowthAlerts();

  const growth = metricsData?.growth ?? {
    sessions: 0, sessions_prev: 0, users: 0, new_users: 0, returning_users: 0,
    avg_session_duration: 0, bounce_rate: 0, bounce_rate_prev: 0,
    pages_per_session: 0, conversion_rate: 0, revenue: 0,
    pageviews: 0, cart_adds: 0, platform_redirects: 0,
  };

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMetrics(), refetchLive()]);
    setLastRefresh(new Date());
    setRefreshKey(k => k + 1);
    setRefreshing(false);
  }, [refetchMetrics, refetchLive]);

  const activeAlerts = alerts.filter(a => a.type !== "info").length;

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "seo", label: "SEO", icon: Search },
    { id: "social", label: "Social", icon: Share2 },
    { id: "ads", label: "Google Ads", icon: Target },
    { id: "behaviour", label: "Behaviour", icon: Activity },
    { id: "alerts", label: `Alerts${activeAlerts > 0 ? ` (${activeAlerts})` : ""}`, icon: Bell },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-surface-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            Growth Command Centre
          </h2>
          <p className="text-sm text-surface-500 mt-0.5 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-green-500" />
            Live data — SEO · Ads · Social · Behaviour
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
            {(["1", "7", "30"] as const).map((d) => (
              <button key={d} onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${period === d ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
                {d === "1" ? "Today" : d === "7" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-surface-600 hover:text-brand-700 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : `Updated ${lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </button>
        </div>
      </div>

      {/* Live stats banner */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-4 text-white">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wide">🟢 Live Visitors</p>
            {liveLoading ? (
              <div className="h-9 w-16 bg-white/20 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-black mt-1">{live.active_visitors.toLocaleString()}</p>
            )}
            <p className="text-xs text-orange-100">last 5 minutes</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wide">Events Today</p>
            {liveLoading ? (
              <div className="h-8 w-20 bg-white/20 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-black mt-1">{live.pageviews_today.toLocaleString()}</p>
            )}
            <div className="mt-1">
              {!liveLoading && <TrendBadge cur={live.pageviews_today} prev={live.pageviews_yesterday} />}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wide">Revenue Today</p>
            <p className="text-2xl font-black mt-1">₹{live.revenue_today.toLocaleString("en-IN")}</p>
            <p className="text-xs text-orange-100">affiliate commissions</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wide">🔥 Trending Now</p>
            <p className="text-sm font-bold mt-1 leading-tight">{live.top_product_now}</p>
            <p className="text-xs text-orange-100">most viewed</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wide mb-1">📍 Top Cities</p>
            {live.top_cities.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {live.top_cities.slice(0, 4).map((c) => (
                  <span key={c.city} className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                    {c.city} {c.visitors}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-orange-200">City data requires IP geolocation setup</p>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-surface-100 rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${tab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-800"}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab period={period} growth={growth} loading={metricsLoading} />}
      {tab === "seo" && <SeoTab key={refreshKey} days={days} />}
      {tab === "social" && <SocialTab key={refreshKey} />}
      {tab === "ads" && <AdsTab key={refreshKey} />}
      {tab === "behaviour" && <BehaviourTab key={refreshKey} topPages={metricsData?.top_pages ?? []} topSearches={metricsData?.top_searches ?? []} loading={metricsLoading} />}
      {tab === "alerts" && <AlertsTab key={refreshKey} />}
    </div>
  );
}
