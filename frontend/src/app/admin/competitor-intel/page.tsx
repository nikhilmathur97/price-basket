"use client";

import { useCallback, useEffect, useState } from "react";
import { Radar, Sparkles, TrendingUp, TrendingDown, PackageX } from "lucide-react";
import { apiClient } from "@/services/api";

interface Insight {
  id: string;
  platform_id: string;
  platform_name: string | null;
  insight_type: "cheapest_share" | "price_trend" | "stockout_pattern";
  period_start: string;
  period_end: string;
  data: Record<string, unknown>;
  summary: string | null;
  created_at: string | null;
}

function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/competitor-intel/insights`, { params: { limit: 100 } });
      setInsights(res.data.items ?? []);
    } catch {
      setError("Could not load competitor insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, loading, error, refetch: fetchInsights };
}

const TYPE_META: Record<Insight["insight_type"], { label: string; icon: React.ElementType; color: string }> = {
  cheapest_share: { label: "Cheapest Share", icon: TrendingUp, color: "bg-green-50 text-green-700" },
  price_trend: { label: "Price Trend", icon: TrendingDown, color: "bg-blue-50 text-blue-700" },
  stockout_pattern: { label: "Stockout Pattern", icon: PackageX, color: "bg-amber-50 text-amber-700" },
};

export default function CompetitorIntelPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const { insights, loading, error, refetch } = useInsights();

  const analyzeNow = async () => {
    setAnalyzing(true);
    try {
      await apiClient.post(`/competitor-intel/analyze`);
      await refetch();
    } catch {
      // stays stale on failure — no toast dependency here
    } finally {
      setAnalyzing(false);
    }
  };

  const byPlatform = insights.reduce<Record<string, Insight[]>>((acc, i) => {
    const key = i.platform_name ?? i.platform_id;
    acc[key] = acc[key] ?? [];
    acc[key].push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-surface-900 flex items-center gap-2">
            <Radar className="w-5 h-5 text-brand-600" />
            Competitor Intelligence AI
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">
            Rolling 7-day price trends from tracked platform data — who&apos;s cheapest, price direction, stockouts.
          </p>
        </div>
        <button
          onClick={analyzeNow}
          disabled={analyzing}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-pulse" : ""}`} />
          {analyzing ? "Analyzing…" : "Analyze now"}
        </button>
      </div>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50">{error}</div>}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1].map((k) => (
            <div key={k} className="card p-5 space-y-3">
              <div className="h-5 w-1/3 bg-surface-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : Object.keys(byPlatform).length === 0 ? (
        <div className="card p-6 text-center text-sm text-surface-500">
          No insights generated yet. Click &quot;Analyze now&quot; to run the first pass over recent price history.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(byPlatform).map(([platform, items]) => (
            <div key={platform} className="card p-5 space-y-3">
              <p className="text-sm font-bold text-surface-900">{platform}</p>
              {items.map((i) => {
                const meta = TYPE_META[i.insight_type];
                const Icon = meta.icon;
                return (
                  <div key={i.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{meta.label}</p>
                      <p className="text-sm text-surface-700">{i.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
