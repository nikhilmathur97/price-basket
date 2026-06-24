"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import toast from "react-hot-toast";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Copy, Check, Loader2, Target, TrendingUp, Plus } from "lucide-react";

const PLATFORMS = ["Instagram", "Reddit", "YouTube Shorts", "Quora", "Email Newsletter", "WhatsApp", "Twitter/X", "LinkedIn"];

const METRIC_NAMES = [
  "ig_reach", "ig_likes", "ig_followers",
  "reddit_upvotes", "reddit_views",
  "youtube_views", "youtube_subscribers",
  "quora_views", "quora_upvotes",
  "email_opens", "email_clicks", "email_subs",
  "whatsapp_link_clicks",
  "twitter_impressions", "twitter_likes",
  "linkedin_impressions", "linkedin_followers",
];

// ── UTM Generator ─────────────────────────────────────────────────────────────

function UTMGenerator() {
  const [url, setUrl] = useState("https://pricebasket.in");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [utmLink, setUtmLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!url || !source || !medium || !campaign) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post("/marketing/utm", {
        destination_url: url, source, medium, campaign,
      });
      setUtmLink(data.utm_link);
    } catch {
      toast.error("Failed to generate UTM link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="font-bold text-surface-900 text-sm mb-3">UTM Link Generator</h3>
      <div className="space-y-2">
        <input type="url" placeholder="Destination URL" value={url} onChange={(e) => setUrl(e.target.value)}
          className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="Source (e.g. reddit)" value={source} onChange={(e) => setSource(e.target.value)}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <input placeholder="Medium (e.g. social)" value={medium} onChange={(e) => setMedium(e.target.value)}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <input placeholder="Campaign name" value={campaign} onChange={(e) => setCampaign(e.target.value)}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <button onClick={generate} disabled={loading || !source || !medium || !campaign}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
          Generate UTM Link
        </button>
        {utmLink && (
          <div className="flex items-center gap-2 p-2 bg-surface-50 rounded-xl border border-surface-200">
            <p className="text-xs text-surface-700 break-all flex-1">{utmLink}</p>
            <button onClick={async () => {
              await navigator.clipboard.writeText(utmLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }} className="btn-ghost px-2 py-1 flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manual Metric Logger ──────────────────────────────────────────────────────

function MetricLogger({ onSaved }: { onSaved: () => void }) {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [metric, setMetric] = useState(METRIC_NAMES[0]);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!value) return;
    setSaving(true);
    try {
      await apiClient.post("/marketing/analytics", {
        platform, metric_name: metric, metric_value: parseInt(value), notes: notes || undefined,
      });
      toast.success("Metric logged!");
      setValue(""); setNotes("");
      onSaved();
    } catch {
      toast.error("Failed to log metric.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="font-bold text-surface-900 text-sm mb-3">Log Performance Metric</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            {METRIC_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <input type="number" placeholder="Value (e.g. 1245)" value={value} onChange={(e) => setValue(e.target.value)}
          className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <button onClick={save} disabled={saving || !value}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Log Metric
        </button>
      </div>
    </div>
  );
}

// ── Goals Tracker ─────────────────────────────────────────────────────────────

function GoalsTracker() {
  const qc = useQueryClient();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalPlatform, setGoalPlatform] = useState(PLATFORMS[0]);
  const [goalMetric, setGoalMetric] = useState(METRIC_NAMES[0]);
  const [goalTarget, setGoalTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: goals = [] } = useQuery<Array<{
    id: string; platform: string; metric_name: string; target_value: number; current_value: number;
  }>>({
    queryKey: ["marketing-goals"],
    queryFn: async () => (await apiClient.get("/marketing/goals")).data,
  });

  const saveGoal = async () => {
    if (!goalTarget) return;
    setSaving(true);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    try {
      await apiClient.post("/marketing/goals", {
        month: thisMonth.toISOString().split("T")[0],
        platform: goalPlatform,
        metric_name: goalMetric,
        target_value: parseInt(goalTarget),
      });
      toast.success("Goal set!");
      setShowAddGoal(false);
      setGoalTarget("");
      qc.invalidateQueries({ queryKey: ["marketing-goals"] });
    } catch {
      toast.error("Failed to set goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-600" />
          <h3 className="font-bold text-surface-900 text-sm">Monthly Goals</h3>
        </div>
        <button onClick={() => setShowAddGoal(!showAddGoal)} className="btn-ghost text-xs px-2 py-1">
          {showAddGoal ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {showAddGoal && (
        <div className="mb-3 p-3 bg-surface-50 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={goalPlatform} onChange={(e) => setGoalPlatform(e.target.value)}
              className="text-xs border border-surface-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)}
              className="text-xs border border-surface-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none">
              {METRIC_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input type="number" placeholder="Target value" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)}
            className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none" />
          <button onClick={saveGoal} disabled={saving || !goalTarget} className="btn-primary w-full text-xs py-1.5">
            {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Save Goal"}
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-xs text-surface-400 text-center py-4">No goals set for this month. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-surface-700">{g.platform} · {g.metric_name}</span>
                  <span className="text-xs text-surface-500">{g.current_value.toLocaleString()} / {g.target_value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-brand-500" : "bg-yellow-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-surface-400 mt-0.5">{pct}% complete</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const [chartDays, setChartDays] = useState(30);

  const { data: summary } = useQuery({
    queryKey: ["marketing-analytics-summary", chartDays],
    queryFn: async () => (await apiClient.get(`/marketing/analytics/summary?days=${chartDays}`)).data as {
      by_platform: Record<string, Record<string, number>>;
      total_estimated_reach: number;
      days: number;
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["marketing-analytics-chart", chartDays],
    queryFn: async () => (await apiClient.get(`/marketing/analytics/chart?days=${chartDays}`)).data as {
      chart: Array<Record<string, number | string>>;
    },
  });

  // Flatten summary for bar chart
  const barData = Object.entries(summary?.by_platform ?? {}).map(([platform, metrics]) => ({
    platform: platform.split("/")[0].split(" ")[0],
    total: Object.values(metrics).reduce((a, b) => a + b, 0),
  })).sort((a, b) => b.total - a.total);

  const BAR_COLORS = ["#ea580c", "#4285f4", "#e1306c", "#1d9bf0", "#25d366", "#ff0000", "#6366f1", "#0077b5"];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-black text-surface-900">{(summary?.total_estimated_reach ?? 0).toLocaleString("en-IN")}</p>
          <p className="text-xs text-surface-500 mt-1">Total Estimated Reach ({chartDays}d)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-black text-surface-900">{Object.keys(summary?.by_platform ?? {}).length}</p>
          <p className="text-xs text-surface-500 mt-1">Active Channels</p>
        </div>
        <div className="card p-4 text-center md:col-span-1 col-span-2">
          <div className="flex items-center justify-center gap-2">
            {([7, 30, 90] as const).map((d) => (
              <button key={d} onClick={() => setChartDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${chartDays === d ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>
                {d}d
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-500 mt-1">Chart Range</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Reach over time */}
        <div className="card p-4">
          <h3 className="font-bold text-surface-900 text-sm mb-3">Reach Over Time</h3>
          {(chartData?.chart ?? []).length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-8">No data yet. Log metrics to see chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData?.chart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                {PLATFORMS.slice(0, 4).map((p, i) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={BAR_COLORS[i]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Content by channel */}
        <div className="card p-4">
          <h3 className="font-bold text-surface-900 text-sm mb-3">Total Reach by Channel</h3>
          {barData.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-8">No data yet. Log metrics to see chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="platform" tick={{ fontSize: 10 }} width={60} />
                <Tooltip />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <UTMGenerator />
        <MetricLogger onSaved={() => qc.invalidateQueries({ queryKey: ["marketing-analytics-summary"] })} />
        <GoalsTracker />
      </div>
    </div>
  );
}
