"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import toast from "react-hot-toast";
import {
  Eye, Copy, CalendarDays, RefreshCw, Trash2, X,
  Search, Filter, Check, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";

const AGENT_META: Record<string, { label: string; emoji: string; color: string }> = {
  seo:       { label: "SEO Blog",    emoji: "🔍", color: "bg-blue-100 text-blue-700" },
  reddit:    { label: "Reddit",      emoji: "🤖", color: "bg-orange-100 text-orange-700" },
  instagram: { label: "Instagram",   emoji: "📸", color: "bg-pink-100 text-pink-700" },
  twitter:   { label: "Twitter/X",   emoji: "𝕏",  color: "bg-sky-100 text-sky-700" },
  whatsapp:  { label: "WhatsApp",    emoji: "💬", color: "bg-green-100 text-green-700" },
  youtube:   { label: "YouTube",     emoji: "▶",  color: "bg-red-100 text-red-700" },
  quora:     { label: "Quora",       emoji: "❓", color: "bg-red-100 text-red-700" },
  email:     { label: "Email",       emoji: "✉",  color: "bg-indigo-100 text-indigo-700" },
  linkedin:  { label: "LinkedIn",    emoji: "💼", color: "bg-blue-100 text-blue-700" },
  campaign:  { label: "Campaign",    emoji: "🚀", color: "bg-orange-100 text-orange-700" },
};

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-surface-100 text-surface-600",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  archived:  "bg-surface-200 text-surface-400",
};

interface ContentItem {
  id: string;
  agent_id: string;
  platform: string;
  title: string | null;
  content: string;
  tone: string | null;
  city: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function LibraryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [viewItem, setViewItem] = useState<ContentItem | null>(null);
  const [scheduleItem, setScheduleItem] = useState<ContentItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ total: number; items: ContentItem[] }>({
    queryKey: ["marketing-library", agentFilter, statusFilter, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (agentFilter) params.set("agent_id", agentFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      return (await apiClient.get(`/marketing/content?${params}`)).data;
    },
  });

  const handleCopy = async (item: ContentItem) => {
    await navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this content? It won't be deleted permanently.")) return;
    try {
      await apiClient.delete(`/marketing/content/${id}`);
      toast.success("Archived.");
      qc.invalidateQueries({ queryKey: ["marketing-library"] });
    } catch {
      toast.error("Failed to archive.");
    }
  };

  const handleScheduleSave = async () => {
    if (!scheduleItem || !scheduleDate) return;
    setScheduling(true);
    try {
      await apiClient.post("/marketing/schedule", {
        content_id: scheduleItem.id,
        platform: scheduleItem.platform,
        scheduled_for: `${scheduleDate}T${scheduleTime}:00Z`,
      });
      toast.success("Scheduled!");
      setScheduleItem(null);
      qc.invalidateQueries({ queryKey: ["marketing-library"] });
    } catch {
      toast.error("Schedule failed.");
    } finally {
      setScheduling(false);
    }
  };

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              type="text"
              placeholder="Search content…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full text-sm border border-surface-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(0); }}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All Agents</option>
            {Object.entries(AGENT_META).map(([id, m]) => <option key={id} value={id}>{m.emoji} {m.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <div className="flex items-center gap-1 text-xs text-surface-400 ml-auto">
            <Filter className="w-3 h-3" />
            {data?.total ?? 0} items
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-50 text-surface-600 border-b border-surface-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Agent</th>
                <th className="text-left px-4 py-3 font-semibold">Title / Preview</th>
                <th className="text-left px-4 py-3 font-semibold">Tone</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t border-surface-100">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-surface-100 rounded animate-pulse w-2/3" />
                    </td>
                  </tr>
                ))
              ) : (data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-surface-400 text-sm">
                    No content found. Run an agent to generate content.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((item, idx) => {
                  const meta = AGENT_META[item.agent_id];
                  return (
                    <tr key={item.id} className={`border-t border-surface-100 hover:bg-surface-50/50 ${idx % 2 === 1 ? "bg-surface-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta?.color ?? "bg-surface-100 text-surface-600"}`}>
                          {meta?.emoji} {meta?.label ?? item.agent_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-surface-900 truncate">
                          {item.title ?? item.content.slice(0, 80)}
                        </p>
                        {item.scheduled_at && (
                          <p className="text-xs text-surface-400">📅 {new Date(item.scheduled_at).toLocaleDateString()}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-surface-500 text-xs">{item.tone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status] ?? STATUS_STYLES.draft}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewItem(item)} className="btn-ghost px-2 py-1" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleCopy(item)} className="btn-ghost px-2 py-1" title="Copy">
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setScheduleItem(item)} className="btn-ghost px-2 py-1" title="Schedule">
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>
                          <a href={`/admin/marketing/agents/${item.agent_id}`} className="btn-ghost px-2 py-1" title="Regenerate">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => handleDelete(item.id)} className="btn-ghost px-2 py-1 text-red-400 hover:text-red-600" title="Archive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-surface-100">
            <span className="text-xs text-surface-400">
              Page {page + 1} of {totalPages} · {data?.total} items
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost px-2 py-1 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-ghost px-2 py-1 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AGENT_META[viewItem.agent_id]?.color}`}>
                    {AGENT_META[viewItem.agent_id]?.emoji} {AGENT_META[viewItem.agent_id]?.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[viewItem.status]}`}>
                    {viewItem.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-surface-900 mt-1 truncate max-w-sm">
                  {viewItem.title ?? "Content preview"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleCopy(viewItem)} className="btn-ghost px-2 py-1 text-xs flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button onClick={() => setViewItem(null)} className="btn-ghost px-2 py-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm text-surface-800 whitespace-pre-wrap font-mono leading-relaxed">{viewItem.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setScheduleItem(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-100">
              <h4 className="font-semibold text-surface-900">Schedule Content</h4>
              <button onClick={() => setScheduleItem(null)} className="btn-ghost px-2 py-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-surface-500 truncate">{scheduleItem.title ?? scheduleItem.content.slice(0, 60)}</p>
              <div>
                <label className="text-xs font-medium text-surface-700 block mb-1">Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-surface-700 block mb-1">Time (IST)</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <button onClick={handleScheduleSave} disabled={!scheduleDate || scheduling}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                {scheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
