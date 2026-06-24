"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import {
  FileText, Rocket, Eye, Bot, CalendarDays, TrendingUp,
  Copy, Check,
} from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const AGENT_META: Record<string, { label: string; color: string; emoji: string }> = {
  seo:       { label: "SEO Blog",     color: "#4285f4", emoji: "🔍" },
  reddit:    { label: "Reddit",       color: "#ff4500", emoji: "🤖" },
  instagram: { label: "Instagram",    color: "#e1306c", emoji: "📸" },
  twitter:   { label: "Twitter/X",    color: "#1d9bf0", emoji: "𝕏" },
  whatsapp:  { label: "WhatsApp",     color: "#25d366", emoji: "💬" },
  youtube:   { label: "YouTube",      color: "#ff0000", emoji: "▶" },
  quora:     { label: "Quora",        color: "#b92b27", emoji: "❓" },
  email:     { label: "Email",        color: "#6366f1", emoji: "✉" },
  linkedin:  { label: "LinkedIn",     color: "#0077b5", emoji: "💼" },
  campaign:  { label: "Campaign",     color: "#ea580c", emoji: "🚀" },
};

interface DashboardStats {
  total_content: number;
  campaigns_this_month: number;
  estimated_reach: number;
  agents_active_7d: number;
  content_scheduled: number;
  top_channel: string | null;
  recent_content: Array<{ id: string; agent_id: string; title: string | null; content: string; created_at: string }>;
  by_platform: Record<string, number>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-surface-900">{value}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-ghost px-2 py-1 text-xs"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function MarketingDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["marketing-dashboard"],
    queryFn: async () => (await apiClient.get("/marketing/dashboard/stats")).data,
    refetchInterval: 30_000,
  });

  const { data: weekData } = useQuery({
    queryKey: ["marketing-schedule-week"],
    queryFn: async () => (await apiClient.get("/marketing/schedule/week")).data as Array<{ id: string; platform: string; scheduled_for: string; is_posted: boolean }>,
  });

  const pieData = stats
    ? Object.entries(stats.by_platform).map(([agent, count]) => ({
        name: AGENT_META[agent]?.label ?? agent,
        value: count,
        color: AGENT_META[agent]?.color ?? "#888",
      }))
    : [];

  const QUICK_LAUNCH = [
    { id: "seo", label: "Write SEO Blog" },
    { id: "reddit", label: "Reddit Post" },
    { id: "instagram", label: "Instagram Content" },
    { id: "twitter", label: "Twitter Thread" },
    { id: "whatsapp", label: "WhatsApp Message" },
    { id: "youtube", label: "YouTube Script" },
    { id: "quora", label: "Quora Answers" },
    { id: "email", label: "Email Newsletter" },
    { id: "linkedin", label: "LinkedIn Post" },
    { id: "campaign", label: "Full Campaign" },
  ];

  // Build week calendar
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Content" value={isLoading ? "—" : (stats?.total_content ?? 0)} icon={FileText} color="bg-blue-100 text-blue-600" />
        <StatCard label="Campaigns" value={isLoading ? "—" : (stats?.campaigns_this_month ?? 0)} icon={Rocket} color="bg-brand-100 text-brand-600" />
        <StatCard label="Est. Reach" value={isLoading ? "—" : (stats?.estimated_reach ?? 0).toLocaleString("en-IN")} icon={Eye} color="bg-green-100 text-green-600" />
        <StatCard label="Agents Active" value={isLoading ? "—" : (stats?.agents_active_7d ?? 0)} icon={Bot} color="bg-purple-100 text-purple-600" />
        <StatCard label="Scheduled" value={isLoading ? "—" : (stats?.content_scheduled ?? 0)} icon={CalendarDays} color="bg-yellow-100 text-yellow-600" />
        <StatCard
          label="Top Channel"
          value={isLoading ? "—" : (stats?.top_channel ? (AGENT_META[stats.top_channel]?.label ?? stats.top_channel) : "—")}
          icon={TrendingUp}
          color="bg-rose-100 text-rose-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Quick Launch */}
        <div className="card p-4">
          <h3 className="font-bold text-surface-900 mb-3 text-sm">Quick Launch</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LAUNCH.map((a) => (
              <Link
                key={a.id}
                href={`/admin/marketing/agents/${a.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-200 hover:border-brand-400 hover:bg-brand-50 transition-colors text-xs font-medium text-surface-700"
              >
                <span>{AGENT_META[a.id]?.emoji}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Content */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-surface-900 text-sm">Recent Content</h3>
            <Link href="/admin/marketing/library" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-surface-100 rounded-xl animate-pulse" />)}</div>
          ) : (stats?.recent_content?.length ?? 0) === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6">No content yet. Run your first agent above.</p>
          ) : (
            <div className="space-y-2">
              {stats?.recent_content.map((c) => (
                <div key={c.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-surface-50 group">
                  <span className="text-base mt-0.5 flex-shrink-0">{AGENT_META[c.agent_id]?.emoji ?? "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-900 truncate">
                      {c.title ?? c.content.slice(0, 80)}
                    </p>
                    <p className="text-xs text-surface-400">{AGENT_META[c.agent_id]?.label} · {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={c.content} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Week Calendar Strip */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-surface-900 text-sm">This Week&apos;s Schedule</h3>
            <Link href="/admin/marketing/scheduler" className="text-xs text-brand-600 hover:underline">Full calendar →</Link>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const dayStr = day.toISOString().split("T")[0];
              const dayItems = (weekData ?? []).filter((s) => s.scheduled_for.startsWith(dayStr));
              const isToday = dayStr === today.toISOString().split("T")[0];
              return (
                <div key={dayStr} className={`rounded-xl p-2 text-center min-h-[80px] ${isToday ? "bg-brand-50 border border-brand-200" : "bg-surface-50"}`}>
                  <p className={`text-xs font-bold mb-1 ${isToday ? "text-brand-600" : "text-surface-500"}`}>
                    {day.toLocaleDateString("en", { weekday: "short" })}
                  </p>
                  <p className={`text-sm font-black mb-2 ${isToday ? "text-brand-700" : "text-surface-700"}`}>{day.getDate()}</p>
                  {dayItems.slice(0, 2).map((item) => (
                    <div key={item.id} className="text-xs rounded px-1 py-0.5 mb-0.5 truncate text-white"
                      style={{ backgroundColor: AGENT_META[item.platform]?.color ?? "#888" }}>
                      {item.platform}
                    </div>
                  ))}
                  {dayItems.length > 2 && <p className="text-xs text-surface-400">+{dayItems.length - 2}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Coverage Donut */}
        <div className="card p-4">
          <h3 className="font-bold text-surface-900 text-sm mb-3">Channel Coverage</h3>
          {pieData.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-8">Generate content to see channel breakdown</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(val: number, name: string) => [val, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pieData.slice(0, 5).map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-surface-600 flex-1 truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-surface-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
