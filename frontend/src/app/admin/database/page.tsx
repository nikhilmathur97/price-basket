"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Users, Package, Store, ShoppingCart, Bell, Database,
  TrendingUp, Activity, RefreshCw, Tag, CheckCircle2,
  ArrowUpRight, Eye, Search, AlertCircle, Loader2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  blinkit: "#F8C300", zepto: "#6D3FD8", instamart: "#FC8019",
  bigbasket: "#84C225", flipkart: "#2874F0", amazon: "#FF9900",
  jiomart: "#0057A8",
};
const CHART_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#84cc16","#06b6d4"];

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtINR(n: number) { return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; }

function StatCard({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; tone: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${tone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-surface-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-surface-900 leading-tight">
          {typeof value === "number" ? fmt(value) : value}
        </p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-brand-600" />
      <h2 className="text-sm font-bold text-surface-800 uppercase tracking-widest">{children}</h2>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-surface-100 rounded-xl shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-surface-600 mb-0.5">{label}</p>
      <p className="font-bold text-surface-900">{fmt(payload[0].value)}</p>
    </div>
  );
}

function ErrorCard({ label, msg, onRetry }: { label: string; msg: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{label}: {msg}</span>
      <button onClick={onRetry} className="underline">retry</button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type TabId = "overview" | "users" | "products" | "platforms" | "events";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "users",     label: "Users" },
  { id: "products",  label: "Products" },
  { id: "platforms", label: "Platforms" },
  { id: "events",    label: "Events" },
];

export default function AdminDatabasePage() {
  const [tab, setTab] = useState<TabId>("overview");

  const results = useQueries({
    queries: [
      { queryKey: ["admin-stats"],        queryFn: () => api.getAdminStats().then(r => r.data),        staleTime: 60_000, retry: 1 },
      { queryKey: ["admin-users-full"],   queryFn: () => api.getAdminUsers({ limit: 1000 }).then(r => r.data), staleTime: 60_000, retry: 1 },
      { queryKey: ["admin-payments"],     queryFn: () => api.getAdminPayments().then(r => r.data),     staleTime: 60_000, retry: 1 },
      { queryKey: ["admin-platforms"],    queryFn: () => api.getAdminPlatforms().then(r => r.data),    staleTime: 60_000, retry: 1 },
      { queryKey: ["admin-logins-30d"],   queryFn: () => api.getAdminDailyLogins(30).then(r => r.data), staleTime: 60_000, retry: 1 },
      { queryKey: ["analytics-stats-7d"], queryFn: () => api.getAnalyticsStats(7).then(r => r.data),  staleTime: 60_000, retry: 1 },
      { queryKey: ["categories"],         queryFn: () => api.getCategories().then(r => r.data),        staleTime: 60_000, retry: 1 },
    ],
  });

  const [statsQ, usersQ, paymentsQ, platformsQ, loginsQ, analyticsQ, categoriesQ] = results;

  const anyLoading = results.some(r => r.isPending);
  const allFailed  = results.every(r => r.isError);

  function refetchAll() { results.forEach(r => r.refetch()); }

  // ── Derived data ──────────────────────────────────────────────────────────

  const stats      = statsQ.data;
  const usersData  = usersQ.data;
  const payments   = paymentsQ.data;
  const platforms  = platformsQ.data as { id: string; slug: string; name: string; is_active: boolean; color_hex: string | null; avg_delivery_minutes: number; delivery_fee: number; scraping_enabled: boolean }[] | undefined;
  const logins     = loginsQ.data;
  const analytics  = analyticsQ.data;
  const categories = categoriesQ.data as { slug: string; name: string; icon: string | null }[] | undefined;

  const users = usersData?.items as {
    id: string; full_name: string; email: string; is_admin: boolean;
    is_active: boolean; is_verified: boolean; oauth_provider?: string;
    created_at: string; last_login_at: string | null; city: string | null;
  }[] | undefined;

  const totalUsers    = usersData?.total ?? stats?.total_users ?? 0;
  const activeUsers   = users?.filter(u => u.is_active).length ?? 0;
  const verifiedUsers = users?.filter(u => u.is_verified).length ?? 0;
  const adminUsers    = users?.filter(u => u.is_admin).length ?? 0;
  const oauthUsers    = users?.filter(u => u.oauth_provider).length ?? 0;

  // signups per day from user list
  const signupByDay = (() => {
    if (!users) return [];
    const map: Record<string, number> = {};
    users.forEach(u => {
      const day = u.created_at?.slice(0, 10);
      if (day) map[day] = (map[day] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-30)
      .map(([day, count]) => ({ day, count }));
  })();

  const totalCartValue  = payments?.summary?.total_amount ?? 0;
  const totalCartItems  = payments?.summary?.total_items ?? 0;
  const usersWithCarts  = payments?.summary?.total_users_with_cart_value ?? 0;

  const activePlatforms = platforms?.filter(p => p.is_active).length ?? stats?.active_platforms ?? 0;

  const eventCounts = analytics?.event_counts ?? {};
  const funnel      = analytics?.funnel ?? { product_views: 0, cart_adds: 0, platform_redirects: 0 };
  const platformClicks = analytics?.platform_clicks ?? [];

  // ── Loading ───────────────────────────────────────────────────────────────

  if (anyLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-surface-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading database overview...
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 h-24 animate-pulse bg-surface-50" />
        ))}
      </div>
    );
  }

  if (allFailed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = (statsQ.error as any)?.response?.data?.detail ?? (statsQ.error as Error)?.message ?? "Check your login session";
    return (
      <div className="card p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="font-bold text-surface-800">Could not load admin data</p>
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-4 py-2 font-mono inline-block">{err}</p>
        <button onClick={refetchAll} className="btn-ghost text-sm flex items-center gap-1.5 mx-auto mt-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry all
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-600" /> Database Overview
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">Live data from all tables</p>
        </div>
        <button onClick={refetchAll} disabled={anyLoading} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${anyLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* ── Partial error banners ───────────────────────────────────── */}
      <div className="space-y-1.5">
        {results.map((r, i) => {
          if (!r.isError) return null;
          const labels = ["Stats","Users","Payments","Platforms","Logins","Analytics","Categories"];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msg = (r.error as any)?.response?.data?.detail ?? (r.error as Error)?.message ?? "failed";
          return <ErrorCard key={i} label={labels[i]} msg={msg} onRetry={() => r.refetch()} />;
        })}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
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

      {/* ══════════════════════ OVERVIEW ══════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            <StatCard label="Total Users"       value={totalUsers}          icon={Users}        tone="bg-blue-50 text-blue-700" />
            <StatCard label="Total Products"    value={stats?.total_products ?? 0}  icon={Package} tone="bg-violet-50 text-violet-700" />
            <StatCard label="Active Platforms"  value={activePlatforms}     icon={Store}        tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Active Carts"      value={stats?.active_carts ?? 0}    icon={ShoppingCart} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Cart Value"        value={fmtINR(totalCartValue)}       icon={ShoppingCart} tone="bg-green-50 text-green-700" />
            <StatCard label="Cart Items"        value={totalCartItems}      icon={Package}      tone="bg-sky-50 text-sky-700" />
            <StatCard label="Users w/ Carts"    value={usersWithCarts}      icon={Users}        tone="bg-orange-50 text-orange-700" />
            <StatCard label="Product Views"     value={funnel.product_views}  icon={Eye}        tone="bg-teal-50 text-teal-700" />
            <StatCard label="Cart Adds"         value={funnel.cart_adds}      icon={ShoppingCart} tone="bg-pink-50 text-pink-700" />
            <StatCard label="Redirects"         value={funnel.platform_redirects} icon={ArrowUpRight} tone="bg-rose-50 text-rose-700" />
            <StatCard label="Searches"          value={eventCounts.search ?? 0} icon={Search}   tone="bg-indigo-50 text-indigo-700" />
            <StatCard label="Categories"        value={categories?.length ?? 0} icon={Tag}      tone="bg-yellow-50 text-yellow-700" />
          </div>

          <div className="card p-5">
            <SectionTitle icon={Database}>Table Row Counts</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { table: "Users",    rows: totalUsers },
                  { table: "Products", rows: stats?.total_products ?? 0 },
                  { table: "Carts",    rows: stats?.active_carts ?? 0 },
                  { table: "Cart Items", rows: totalCartItems },
                  { table: "Platforms", rows: platforms?.length ?? 0 },
                  { table: "Categories", rows: categories?.length ?? 0 },
                  { table: "Events",   rows: (analytics?.event_counts ? Object.values(analytics.event_counts).reduce((a: number, b: unknown) => a + (b as number), 0) : 0) },
                ]}
                margin={{ top: 4, right: 0, left: 0, bottom: 32 }}
              >
                <XAxis dataKey="table" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="rows" radius={[4, 4, 0, 0]}>
                  {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══════════════════════ USERS ═════════════════════════════════ */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total"          value={totalUsers}        icon={Users}        tone="bg-blue-50 text-blue-700" />
            <StatCard label="Active"         value={activeUsers}       icon={CheckCircle2} tone="bg-green-50 text-green-700" />
            <StatCard label="Verified"       value={verifiedUsers}     icon={CheckCircle2} tone="bg-teal-50 text-teal-700" />
            <StatCard label="Admins"         value={adminUsers}        icon={Users}        tone="bg-violet-50 text-violet-700" />
            <StatCard label="OAuth / Social" value={oauthUsers}        icon={Users}        tone="bg-amber-50 text-amber-700" />
            <StatCard label="Password login" value={totalUsers - oauthUsers} icon={Users}  tone="bg-rose-50 text-rose-700" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <SectionTitle icon={Users}>Auth Method</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Password", value: totalUsers - oauthUsers },
                      { name: "OAuth",    value: oauthUsers },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={65} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#6366f1" /><Cell fill="#f59e0b" />
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
                      { name: "Active",   value: activeUsers },
                      { name: "Inactive", value: totalUsers - activeUsers },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={65} dataKey="value"
                  >
                    <Cell fill="#10b981" /><Cell fill="#f43f5e" />
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {signupByDay.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={TrendingUp}>Signups — Last 30 Days</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={signupByDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {logins?.trend?.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Activity}>Login Activity — Last 30 Days</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={logins.trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {users && users.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Users}>All Users ({fmt(totalUsers)})</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="pb-2 pr-3">Name</th>
                      <th className="pb-2 pr-3">Email</th>
                      <th className="pb-2 pr-3">City</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Type</th>
                      <th className="pb-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 50).map(u => (
                      <tr key={u.id} className="border-b border-surface-50 last:border-0">
                        <td className="py-1.5 pr-3 font-medium text-surface-900">
                          {u.full_name ?? "—"}
                          {u.is_admin && <span className="ml-1 text-brand-600 font-bold">Admin</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-surface-500">{u.email}</td>
                        <td className="py-1.5 pr-3 text-surface-400">{u.city ?? "—"}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${u.is_active ? "bg-green-500" : "bg-surface-300"}`} />
                          {u.is_active ? "Active" : "Inactive"}
                        </td>
                        <td className="py-1.5 pr-3 text-surface-400">
                          {u.oauth_provider ? `OAuth (${u.oauth_provider})` : "Password"}
                        </td>
                        <td className="py-1.5 text-surface-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length > 50 && (
                  <p className="text-xs text-surface-400 mt-2 text-center">Showing first 50 of {fmt(users.length)} users</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ PRODUCTS ══════════════════════════════ */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Products"  value={stats?.total_products ?? 0}   icon={Package} tone="bg-violet-50 text-violet-700" />
            <StatCard label="Categories"      value={categories?.length ?? 0}       icon={Tag}    tone="bg-amber-50 text-amber-700" />
          </div>

          {payments?.items?.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={ShoppingCart}>Cart Value by User (Top 20)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(payments.items as { full_name: string; amount: number; items_count: number }[])
                    .slice(0, 20)
                    .map((r) => ({ name: r.full_name?.split(" ")[0] ?? "User", amount: Math.round(r.amount), items: r.items_count }))}
                  margin={{ top: 4, right: 0, left: 0, bottom: 40 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {[...Array(20)].map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categories && categories.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Tag}>All Categories</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {categories.map((c) => (
                  <div key={c.slug} className="flex items-center gap-2 bg-surface-50 rounded-xl px-3 py-2">
                    <span className="text-lg">{c.icon ?? "📦"}</span>
                    <div>
                      <p className="text-xs font-semibold text-surface-800">{c.name}</p>
                      <p className="text-xs text-surface-400 font-mono">{c.slug}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ PLATFORMS ═════════════════════════════ */}
      {tab === "platforms" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Platforms"  value={platforms?.length ?? 0}  icon={Store}        tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Active Platforms" value={activePlatforms}          icon={CheckCircle2} tone="bg-green-50 text-green-700" />
          </div>

          {platformClicks.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={ArrowUpRight}>Platform Click-throughs (7 days)</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={platformClicks} margin={{ top: 4, right: 0, left: 0, bottom: 40 }}>
                  <XAxis dataKey="platform" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="clicks" radius={[4, 4, 0, 0]}>
                    {platformClicks.map((_: unknown, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {platforms && (
            <div className="card p-5">
              <SectionTitle icon={Store}>Platform Details</SectionTitle>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="pb-2 pr-3">Platform</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Scraping</th>
                      <th className="pb-2 pr-3 text-right">Delivery</th>
                      <th className="pb-2 text-right">Delivery Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platforms.map(p => (
                      <tr key={p.id} className="border-b border-surface-50 last:border-0">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[p.slug] ?? p.color_hex ?? "#ccc" }} />
                            <span className="font-semibold text-surface-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? "bg-green-100 text-green-700" : "bg-surface-100 text-surface-500"}`}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-surface-500">{p.scraping_enabled ? "Enabled" : "Off"}</td>
                        <td className="py-2 pr-3 text-right text-surface-600">{p.avg_delivery_minutes} min</td>
                        <td className="py-2 text-right text-surface-600">
                          {p.delivery_fee > 0 ? fmtINR(p.delivery_fee) : "Free"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ EVENTS ════════════════════════════════ */}
      {tab === "events" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Product Views"    value={funnel.product_views}       icon={Eye}          tone="bg-sky-50 text-sky-700" />
            <StatCard label="Cart Adds"        value={funnel.cart_adds}            icon={ShoppingCart} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Redirects"        value={funnel.platform_redirects}  icon={ArrowUpRight} tone="bg-green-50 text-green-700" />
            <StatCard label="Searches"         value={eventCounts.search ?? 0}    icon={Search}       tone="bg-violet-50 text-violet-700" />
            <StatCard label="Unique Visitors"  value={analytics?.unique_clients ?? 0} icon={Users}   tone="bg-blue-50 text-blue-700" />
            <StatCard label="Logged-in Users"  value={analytics?.unique_registered_users ?? 0} icon={Users} tone="bg-teal-50 text-teal-700" />
          </div>

          {Object.keys(eventCounts).length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={Activity}>All Event Types (7 days)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={Object.entries(eventCounts).map(([type, count]) => ({ type, count: count as number }))}
                  layout="vertical"
                  margin={{ top: 4, right: 32, left: 100, bottom: 4 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {Object.keys(eventCounts).map((_: string, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card p-5">
            <SectionTitle icon={TrendingUp}>Conversion Funnel (7 days)</SectionTitle>
            <div className="space-y-3">
              {[
                { label: "Product Views", count: funnel.product_views, color: "bg-brand-600" },
                { label: "Cart Adds",     count: funnel.cart_adds,     color: "bg-amber-500" },
                { label: "Redirects",     count: funnel.platform_redirects, color: "bg-green-500" },
              ].map(step => {
                const pct = funnel.product_views > 0 ? Math.max(4, (step.count / funnel.product_views) * 100) : 4;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-medium text-surface-600 flex-shrink-0">{step.label}</span>
                    <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${step.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-xs font-bold text-surface-900 text-right">{fmt(step.count)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {analytics?.top_viewed_products?.length > 0 && (
            <div className="card p-5">
              <SectionTitle icon={TrendingUp}>Top Viewed Products</SectionTitle>
              <div className="space-y-2">
                {analytics.top_viewed_products.map((p: { product_id: string; name: string; brand: string; views: number }, i: number) => (
                  <div key={p.product_id} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                    <span className="w-5 text-xs font-bold text-surface-400 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-surface-900 truncate">{p.name}</p>
                      {p.brand && <p className="text-xs text-surface-400">{p.brand}</p>}
                    </div>
                    <span className="text-xs font-bold text-surface-700 flex-shrink-0 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-surface-400" />{fmt(p.views)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!Object.keys(eventCounts).length && (
            <div className="card p-10 text-center">
              <Bell className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="font-semibold text-surface-600">No events recorded yet</p>
              <p className="text-xs text-surface-400 mt-1">Events are captured as users browse, search, and interact.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
