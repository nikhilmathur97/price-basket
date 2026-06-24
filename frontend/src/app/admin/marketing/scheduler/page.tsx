"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import toast from "react-hot-toast";
import { Copy, Check, CheckCircle2, Clock, Loader2, Eye, X } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  "Google Search / Blog": "#4285f4",
  "Reddit":               "#ff4500",
  "Instagram":            "#e1306c",
  "Twitter/X":            "#1d9bf0",
  "WhatsApp":             "#25d366",
  "YouTube Shorts":       "#ff0000",
  "Quora":                "#b92b27",
  "Email Newsletter":     "#6366f1",
  "LinkedIn":             "#0077b5",
  "All Channels":         "#ea580c",
};

interface ScheduleItem {
  id: string;
  content_id: string | null;
  platform: string;
  scheduled_for: string;
  notes: string | null;
  is_posted: boolean;
  posted_at: string | null;
}

interface ContentItem {
  id: string;
  content: string;
  title: string | null;
  agent_id: string;
}

export default function SchedulerPage() {
  const qc = useQueryClient();
  const [viewContent, setViewContent] = useState<ContentItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { data: todayItems = [], isLoading: todayLoading } = useQuery<ScheduleItem[]>({
    queryKey: ["marketing-today"],
    queryFn: async () => (await apiClient.get("/marketing/schedule/today")).data,
    refetchInterval: 60_000,
  });

  const { data: weekItems = [] } = useQuery<ScheduleItem[]>({
    queryKey: ["marketing-week"],
    queryFn: async () => (await apiClient.get("/marketing/schedule/week")).data,
    refetchInterval: 120_000,
  });

  const handleMarkPosted = async (scheduleId: string) => {
    setMarkingId(scheduleId);
    try {
      await apiClient.put(`/marketing/schedule/${scheduleId}`, { is_posted: true });
      toast.success("Marked as posted!");
      qc.invalidateQueries({ queryKey: ["marketing-today"] });
      qc.invalidateQueries({ queryKey: ["marketing-week"] });
    } catch {
      toast.error("Failed to update.");
    } finally {
      setMarkingId(null);
    }
  };

  const handleCopyContent = async (item: ScheduleItem) => {
    if (!item.content_id) return;
    try {
      const { data } = await apiClient.get(`/marketing/content/${item.content_id}`);
      await navigator.clipboard.writeText(data.content);
      setCopiedId(item.id);
      toast.success("Content copied!");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copy failed.");
    }
  };

  const handleViewContent = async (item: ScheduleItem) => {
    if (!item.content_id) return;
    try {
      const { data } = await apiClient.get(`/marketing/content/${item.content_id}`);
      setViewContent(data);
    } catch {
      toast.error("Could not load content.");
    }
  };

  // Build week grid
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const getItemsForDay = (day: Date) => {
    const ds = day.toISOString().split("T")[0];
    return weekItems.filter((s) => s.scheduled_for.startsWith(ds));
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's Queue */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-brand-600" />
            <h3 className="font-bold text-surface-900 text-sm">Today&apos;s Queue</h3>
            <span className="ml-auto text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-medium">
              {todayItems.filter((s) => !s.is_posted).length} pending
            </span>
          </div>

          {todayLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
            </div>
          ) : todayItems.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">Nothing scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todayItems.map((item) => (
                <div key={item.id} className={`p-3 rounded-xl border ${item.is_posted ? "border-green-200 bg-green-50" : "border-surface-200 bg-surface-50"}`}>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: PLATFORM_COLORS[item.platform] ?? "#888" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-surface-900">{item.platform}</p>
                      <p className="text-xs text-surface-400">
                        {new Date(item.scheduled_for).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {item.notes && <p className="text-xs text-surface-500 mt-1 italic">{item.notes}</p>}
                    </div>
                    {item.is_posted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <div className="flex gap-1 flex-shrink-0">
                        {item.content_id && (
                          <>
                            <button onClick={() => handleViewContent(item)} className="btn-ghost px-1.5 py-1" title="View">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleCopyContent(item)} className="btn-ghost px-1.5 py-1" title="Copy">
                              {copiedId === item.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleMarkPosted(item.id)}
                          disabled={markingId === item.id}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors flex items-center gap-1"
                        >
                          {markingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Posted
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Week view */}
        <div className="card p-4 lg:col-span-2">
          <h3 className="font-bold text-surface-900 text-sm mb-3">7-Day Schedule</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => {
              const isToday = day.toDateString() === today.toDateString();
              const dayItems = getItemsForDay(day);
              return (
                <div key={day.toISOString()} className={`rounded-xl p-2 min-h-[120px] ${isToday ? "bg-brand-50 border border-brand-200" : "bg-surface-50"}`}>
                  <p className={`text-xs font-bold text-center mb-1 ${isToday ? "text-brand-600" : "text-surface-500"}`}>
                    {day.toLocaleDateString("en", { weekday: "short" })}
                  </p>
                  <p className={`text-base font-black text-center mb-2 ${isToday ? "text-brand-700" : "text-surface-700"}`}>
                    {day.getDate()}
                  </p>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`text-xs rounded px-1 py-0.5 truncate text-white font-medium ${item.is_posted ? "opacity-50" : ""}`}
                        style={{ backgroundColor: PLATFORM_COLORS[item.platform] ?? "#888" }}
                        title={item.platform}
                      >
                        {item.platform.split("/")[0].split(" ")[0]}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-xs text-surface-400 text-center">+{dayItems.length - 3} more</p>
                    )}
                    {dayItems.length === 0 && (
                      <p className="text-xs text-surface-300 text-center pt-2">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Platform legend */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-100">
            {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
              <div key={platform} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-surface-400">{platform.split("/")[0].split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content view modal */}
      {viewContent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewContent(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-100">
              <h4 className="font-semibold text-surface-900">{viewContent.title ?? "Content Preview"}</h4>
              <div className="flex gap-2">
                <button onClick={async () => {
                  await navigator.clipboard.writeText(viewContent.content);
                  toast.success("Copied!");
                }} className="btn-ghost px-2 py-1 text-xs flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button onClick={() => setViewContent(null)} className="btn-ghost px-2 py-1"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm text-surface-800 whitespace-pre-wrap font-mono leading-relaxed">{viewContent.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
