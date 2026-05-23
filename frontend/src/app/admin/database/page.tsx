"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Users, Package, Store, ShoppingCart, Bell, Database,
  TrendingUp, Heart, Key, Activity, RefreshCw, Tag,
  CheckCircle2, XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbOverview {
  generated_at: string;
  users: {
    total: number; active: number; verified: number; admin_count: number;
    oauth_users: number; password_users: number;
    signup_trend: { day: string; count: number }[];
  };
  products: {
    total: number; active: number; featured: number; with_images: number;
    by_category: { category: string; count: number }[];
    top_brands: { brand: string; count: number }[];
  };
  categories: {
    total: number; active: number;
    detail: { slug: string; name: string; icon: string | null; product_count: number }[];
  };
  platforms: {
    total: number; active: number;
    detail: {
      slug: string; name: string; is_active: boolean; color_hex: string | null;
      scraping_enabled: boolean; scrape_failure_count: number;
      last_successful_scrape: string | null; price_entries: number;
    }[];
  };
  prices: {
    total: number; available: number; unavailable: number; avg_discount_percent: number;
    by_platform: { name: string; slug: string; count: number; avg_price: number; min_price: number; max_price: number }[];
  };
  price_history: { total: number };
  price_alerts: { total: number; active: number; triggered: number };
  carts: { total: number; active: number; guest: number; total_items: number; total_value_inr: number };
  wishlists: { total: number; total_items: number };
  refresh_tokens: { total: number; active: number };
  user_events: {
    total: number;
    by_type: { type: string; count: number }[];
    trend: { day: string; count: number }[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899",
  "#8b5cf6", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
];

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtINR(n: number) { return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; }

function StatCard({
  label, value, sub, icon: Icon, tone,
}: { label: string; value: string | number; sub?: string; icon: React.ElementType; tone: string }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${tone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-surface-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-surface-900 leading-tight">{typeof value === "number" ? fmt(value) : value}</p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-brand-600" />
      <h2 className="text-sm font-bold text-surface-800 uppercase tracking-widest">{children}</h2>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-surface-100 rounded-xl shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-surface-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-surface-900 font-bold">{fmt(p.value)}</p>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDatabasePage() {
  const [tab, setTab] = useState<
    "overview" | "users" | "products" | "platforms" | "prices" | "carts" | "events"
  >("overview");

  const { data, isPending, isError, error, refetch, isFetching, status } = useQuery<DbOverview>({
    queryKey: ["admin-db-overview"],
    queryFn: async () => {
      const res = await api.getAdminDbOverview();
      return res.data;
    },
    staleTime: 60_000,
    retry: 1,
  });

  // React Query v5: use isPending (not isLoading) — isLoading = isPending && isFetching
  if (isPending) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 h-24 animate-pulse bg-surface-50" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errAny = error as any;
    const httpStatus = errAny?.response?.status;
    const detail = errAny?.response?.data?.detail ?? errAny?.message ?? "Unknown error";
    const msg = typeof detail === "string" ? detail : JSON.stringify(detail);

    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-2xl">⚠️</p>
        <p className="font-bold text-surface-800">Failed to load database overview</p>
        <p className="text-sm text-rose-600 font-mono bg-rose-50 rounded-lg px-4 py-2 inline-block max-w-md">
          {httpStatus ? `HTTP ${httpStatus}: ` : ""}{msg}
        </p>
        <p className="text-xs text-surface-400">Query status: <span className="font-mono">{status}</span></p>
        <div>
          <button onClick={() => refetch()} className="btn-ghost text-sm mt-2 flex items-center gap-1.5 mx-auto">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "users",    label: "Users" },
    { id: "products", label: "Products" },
    { id: "platforms",label: "Platforms" },
    { id: "prices",   label: "Prices" },
    { id: "carts",    label: "Carts" },
    { id: "events",   label: "Events" },
  ] as const;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-600" /> Database Overview
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Snapshot at {new Date(data.generated_at).toLocaleString("en-IN")}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════ OVERVIEW ════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            <StatCard label="Total Users"        value={data.users.total}            icon={Users}        tone="bg-blue-50 text-blue-700" />
            <StatCard label="Products"           value={data.products.total}         icon={Package}      tone="bg-violet-50 text-violet-700" />
            <StatCard label="Platform Prices"    value={data.prices.total}           icon={Store}        tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Active Carts"       value={data.carts.active}           icon={ShoppingCart} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Price Alerts"       value={data.price_alerts.total}     icon={Bell}         tone="bg-rose-50 text-rose-700" />
            <StatCard label="Wishlists"          value={data.wishlists.total}        icon={Heart}        tone="bg-pink-50 text-pink-700" />
            <StatCard label="User Events"        value={data.user_events.total}      icon={Activity}     tone="bg-sky-50 text-sky-700" />
            <StatCard label="Active Tokens"      value={data.refresh_tokens.active}  icon={Key}          tone="bg-slate-50 text-slate-700" />
            <StatCard label="Categories"         value={data.categories.total}       icon={Tag}          tone="bg-orange-50 text-orange-700" />
            <StatCard label="Price History Rows" value={data.price_history.total}    icon={TrendingUp}   tone="bg-teal-50 text-teal-700" />
            <StatCard label="Cart Value"         value={fmtINR(data.carts.total_value_inr)} icon={ShoppingCart} tone="bg-green-50 text-green-700" />
            <StatCard label="Avg Discount"       value={`${data.prices.avg_discount_percent}%`} icon={Tag} tone="bg-yellow-50 text-yellow-700" />
          </div>

          {/* All tables at a glance */}
          <div className="card p-5">
            <SectionTitle icon={Database}>All Tables — Row Counts</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { table: "Users",          rows: data.users.total },
                  { table: "Products",       rows: data.products.total },
                  { table: "Prices",         rows: data.prices.total },
                  { table: "Price History",  rows: data.price_history.total },
                  { table: "Cart Items",     rows: data.carts.total_items },
                  { table: "Carts",          rows: data.carts.total },
                  { table: "Wishlists",      rows: data.wishlists.total },
                  { table: "W. Items",       rows: data.wishlists.total_items },
                  { table: "Alerts",         rows: data.price_alerts.total },
                  { table: "Events",         rows: data.user_events.total },
                  { table: "Tokens",         rows: data.refresh_tokens.total },
                ]}
                margin={{ top: 4, right: 0, left: 0, bottom: 40 }}
              >
                <XAxis dataKey="table" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rows" radius={[4, 4, 0, 0]}>
                  {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ USERS ════════════════════════════ */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total"     value={data.users.total}          icon={Users} tone="bg-blue-50 text-blue-700" />
            <StatCard label="Active"    value={data.users.active}         icon={CheckCircle2} tone="bg-green-50 text-green-700" />
            <StatCard label="Verified"  value={data.users.verified}       icon={CheckCircle2} tone="bg-teal-50 text-teal-700" />
            <StatCard label="Admins"    value={data.users.admin_count}    icon={Users} tone="bg-violet-50 text-violet-700" />
            <StatCard label="OAuth"     value={data.users.oauth_users}    icon={Key} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Password"  value={data.users.password_users} icon={Key} tone="bg-rose-50 text-rose-700" />
          </div>

          {/* Auth type pie */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <SectionTitle icon={Users}>Auth Method</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Password", value: data.users.password_users },
                      { name: "OAuth", value: data.users.oauth_users },
                    ]}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <SectionTitle icon={Users}>Account Status</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Active", value: data.users.active },
                      { name: "Inactive", value: data.users.total - data.users.active },
                      { name: "Verified", value: data.users.verified },
                    ]}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  >
                    {["#10b981", "#f43f5e", "#3b82f6"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Signup trend */}
          {data.users.signup_trend.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={TrendingUp}>Signups — Last 30 Days</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.users.signup_trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ PRODUCTS ═════════════════════════ */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total"      value={data.products.total}    icon={Package}      tone="bg-violet-50 text-violet-700" />
            <StatCard label="Active"     value={data.products.active}   icon={CheckCircle2} tone="bg-green-50 text-green-700" />
            <StatCard label="Featured"   value={data.products.featured} icon={TrendingUp}   tone="bg-amber-50 text-amber-700" />
            <StatCard label="With Images" value={data.products.with_images} icon={Package}  tone="bg-sky-50 text-sky-700" />
          </div>

          {/* By category */}
          {data.products.by_category.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Tag}>Products by Category</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.products.by_category} margin={{ top: 4, right: 0, left: 0, bottom: 50 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.products.by_category.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top brands */}
          {data.products.top_brands.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Package}>Top 10 Brands</SectionTitle>
              <div className="space-y-2 mt-2">
                {data.products.top_brands.map((b, i) => {
                  const max = data.products.top_brands[0].count;
                  return (
                    <div key={b.brand} className="grid grid-cols-[140px_1fr_40px] items-center gap-2">
                      <span className="text-xs font-medium text-surface-700 truncate">{b.brand}</span>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(b.count / max) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                      <span className="text-xs font-bold text-surface-900 text-right">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories detail table */}
          <div className="card p-5">
            <SectionTitle icon={Tag}>All Categories</SectionTitle>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-surface-400 border-b border-surface-100">
                    <th className="pb-2 pr-3">Icon</th>
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Slug</th>
                    <th className="pb-2 text-right">Products</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.detail.map((c) => (
                    <tr key={c.slug} className="border-b border-surface-50 last:border-0">
                      <td className="py-1.5 pr-3 text-lg">{c.icon ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-medium text-surface-900">{c.name}</td>
                      <td className="py-1.5 pr-3 text-surface-400 font-mono">{c.slug}</td>
                      <td className="py-1.5 text-right font-bold text-surface-900">{c.product_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ PLATFORMS ════════════════════════ */}
      {tab === "platforms" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Platforms"  value={data.platforms.total}  icon={Store} tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Active Platforms" value={data.platforms.active} icon={CheckCircle2} tone="bg-green-50 text-green-700" />
          </div>

          {/* Price entries per platform */}
          {data.platforms.detail.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Store}>Price Entries per Platform</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.platforms.detail} margin={{ top: 4, right: 0, left: 0, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="price_entries" radius={[4, 4, 0, 0]}>
                    {data.platforms.detail.map((p, i) => (
                      <Cell key={i} fill={p.color_hex ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Platform detail table */}
          <div className="card p-5">
            <SectionTitle icon={Store}>Platform Status</SectionTitle>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-surface-400 border-b border-surface-100">
                    <th className="pb-2 pr-3">Platform</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Scraping</th>
                    <th className="pb-2 pr-3">Failures</th>
                    <th className="pb-2 pr-3">Last Scrape</th>
                    <th className="pb-2 text-right">Prices</th>
                  </tr>
                </thead>
                <tbody>
                  {data.platforms.detail.map((p) => (
                    <tr key={p.slug} className="border-b border-surface-50 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: p.color_hex ?? "#ccc" }}
                          />
                          <span className="font-semibold text-surface-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        {p.is_active
                          ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Active</span>
                          : <span className="text-surface-400 flex items-center gap-1"><XCircle className="w-3 h-3" />Inactive</span>}
                      </td>
                      <td className="py-2 pr-3 text-surface-500">{p.scraping_enabled ? "Enabled" : "Off"}</td>
                      <td className="py-2 pr-3">
                        <span className={p.scrape_failure_count > 0 ? "text-rose-600 font-bold" : "text-surface-400"}>
                          {p.scrape_failure_count}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-surface-400">
                        {p.last_successful_scrape
                          ? new Date(p.last_successful_scrape).toLocaleDateString("en-IN")
                          : "Never"}
                      </td>
                      <td className="py-2 text-right font-bold text-surface-900">{fmt(p.price_entries)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ PRICES ═══════════════════════════ */}
      {tab === "prices" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Prices"    value={data.prices.total}                icon={Store}        tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Available"       value={data.prices.available}            icon={CheckCircle2} tone="bg-green-50 text-green-700" />
            <StatCard label="Unavailable"     value={data.prices.unavailable}          icon={XCircle}      tone="bg-rose-50 text-rose-700" />
            <StatCard label="Avg Discount"    value={`${data.prices.avg_discount_percent}%`} icon={Tag}    tone="bg-yellow-50 text-yellow-700" />
            <StatCard label="Price History"   value={data.price_history.total}         icon={TrendingUp}   tone="bg-teal-50 text-teal-700" />
            <StatCard label="Alerts Total"    value={data.price_alerts.total}          icon={Bell}         tone="bg-violet-50 text-violet-700" />
            <StatCard label="Alerts Active"   value={data.price_alerts.active}         icon={Bell}         tone="bg-amber-50 text-amber-700" />
            <StatCard label="Alerts Triggered" value={data.price_alerts.triggered}    icon={Bell}         tone="bg-rose-50 text-rose-700" />
          </div>

          {/* Availability pie */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <SectionTitle icon={Store}>Price Availability</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Available", value: data.prices.available },
                      { name: "Unavailable", value: data.prices.unavailable },
                    ]}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <SectionTitle icon={Bell}>Price Alert Status</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Active", value: data.price_alerts.active },
                      { name: "Triggered", value: data.price_alerts.triggered },
                      { name: "Inactive", value: data.price_alerts.total - data.price_alerts.active - data.price_alerts.triggered },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  >
                    {["#6366f1", "#f59e0b", "#94a3b8"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prices by platform */}
          {data.prices.by_platform.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Store}>Avg Price per Platform (₹)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.prices.by_platform} margin={{ top: 4, right: 0, left: 0, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_price" radius={[4, 4, 0, 0]}>
                    {data.prices.by_platform.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed price table */}
          {data.prices.by_platform.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Store}>Price Range per Platform</SectionTitle>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="pb-2 pr-3">Platform</th>
                      <th className="pb-2 pr-3 text-right">Count</th>
                      <th className="pb-2 pr-3 text-right">Min ₹</th>
                      <th className="pb-2 pr-3 text-right">Avg ₹</th>
                      <th className="pb-2 text-right">Max ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.prices.by_platform.map((p) => (
                      <tr key={p.slug} className="border-b border-surface-50 last:border-0">
                        <td className="py-2 pr-3 font-semibold text-surface-900">{p.name}</td>
                        <td className="py-2 pr-3 text-right text-surface-600">{fmt(p.count)}</td>
                        <td className="py-2 pr-3 text-right text-surface-600">{p.min_price}</td>
                        <td className="py-2 pr-3 text-right font-bold text-surface-900">{p.avg_price}</td>
                        <td className="py-2 text-right text-surface-600">{p.max_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ CARTS ════════════════════════════ */}
      {tab === "carts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Carts"     value={data.carts.total}               icon={ShoppingCart} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Active Carts"    value={data.carts.active}              icon={CheckCircle2} tone="bg-green-50 text-green-700" />
            <StatCard label="Guest Carts"     value={data.carts.guest}               icon={ShoppingCart} tone="bg-surface-100 text-surface-600" />
            <StatCard label="Cart Items"      value={data.carts.total_items}         icon={Package}      tone="bg-violet-50 text-violet-700" />
            <StatCard label="Total Cart Value" value={fmtINR(data.carts.total_value_inr)} icon={ShoppingCart} tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Wishlists"       value={data.wishlists.total}           icon={Heart}        tone="bg-pink-50 text-pink-700" />
            <StatCard label="Wishlist Items"  value={data.wishlists.total_items}     icon={Heart}        tone="bg-rose-50 text-rose-700" />
            <StatCard label="Refresh Tokens"  value={data.refresh_tokens.total}      icon={Key}          tone="bg-slate-50 text-slate-700" />
            <StatCard label="Active Tokens"   value={data.refresh_tokens.active}     icon={Key}          tone="bg-teal-50 text-teal-700" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <SectionTitle icon={ShoppingCart}>Cart Breakdown</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "User Carts", value: data.carts.total - data.carts.guest },
                      { name: "Guest Carts", value: data.carts.guest },
                      { name: "Inactive", value: data.carts.total - data.carts.active },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  >
                    {["#6366f1", "#f59e0b", "#94a3b8"].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <SectionTitle icon={Key}>Token Status</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Active", value: data.refresh_tokens.active },
                      { name: "Expired/Revoked", value: data.refresh_tokens.total - data.refresh_tokens.active },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ EVENTS ═══════════════════════════ */}
      {tab === "events" && (
        <div className="space-y-4">
          <StatCard label="Total User Events" value={data.user_events.total} icon={Activity} tone="bg-sky-50 text-sky-700" />

          {data.user_events.by_type.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Activity}>Events by Type</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.user_events.by_type} layout="vertical" margin={{ top: 4, right: 32, left: 80, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.user_events.by_type.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.user_events.trend.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={TrendingUp}>Event Trend — Last 14 Days</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.user_events.trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.user_events.by_type.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-semibold text-surface-700">No events recorded yet</p>
              <p className="text-xs text-surface-400 mt-1">Events are captured as users browse, search, and interact.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
