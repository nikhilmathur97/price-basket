"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, RefreshCw, Sparkles } from "lucide-react";
import { apiClient } from "@/services/api";

type Period = "daily" | "weekly" | "monthly";

interface ExecutiveReport {
  id: string;
  period: Period;
  report_date: string;
  metrics: Record<string, unknown>;
  narrative: string | null;
  generated_at: string | null;
}

function useReports(period: Period) {
  const [reports, setReports] = useState<ExecutiveReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/executive/reports`, { params: { period, limit: 30 } });
      setReports(res.data.items ?? []);
    } catch {
      setError("Could not load executive reports.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}

export default function ExecutiveReportsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [generating, setGenerating] = useState(false);
  const { reports, loading, error, refetch } = useReports(period);

  const generateNow = async () => {
    setGenerating(true);
    try {
      await apiClient.post(`/executive/reports/generate`, null, { params: { period } });
      await refetch();
    } catch {
      // surfaced via the card below staying stale — no toast lib dependency here
    } finally {
      setGenerating(false);
    }
  };

  const latest = reports[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-surface-900 flex items-center gap-2">
            <Crown className="w-5 h-5 text-brand-600" />
            Executive Reports AI
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">
            AI-generated business summaries — DAU/MAU, redirects, top products, growth recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  period === p ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={generateNow}
            disabled={generating}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Generating…" : "Generate now"}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50">{error}</div>}

      {loading ? (
        <div className="card p-6 space-y-3">
          <div className="h-5 w-1/3 bg-surface-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-surface-100 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-surface-100 rounded animate-pulse" />
        </div>
      ) : !latest ? (
        <div className="card p-6 text-center text-sm text-surface-500">
          No {period} report generated yet. Click "Generate now" to create the first one.
        </div>
      ) : (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
              {latest.report_date}
            </p>
            <RefreshCw className="w-3.5 h-3.5 text-surface-300" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries({
              "Active Users": latest.metrics.active_users,
              "Redirects": latest.metrics.platform_redirects,
              "Searches": latest.metrics.searches,
              "Content Published": latest.metrics.content_published,
            }).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-black text-surface-900">{String(value ?? "—")}</p>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-surface-100">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-2">AI Summary</p>
            <p className="text-sm text-surface-700 whitespace-pre-line">{latest.narrative}</p>
          </div>
        </div>
      )}

      {reports.length > 1 && (
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">History</p>
          <div className="space-y-2">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-surface-50 last:border-0">
                <span className="text-surface-700">{r.report_date}</span>
                <span className="text-surface-400">{String(r.metrics.active_users ?? 0)} active users</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
