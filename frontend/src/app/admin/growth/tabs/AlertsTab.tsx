"use client";
import { CheckCircle, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import { useGrowthAlerts } from "../GrowthData";

export function AlertsTab() {
  const { alerts, loading, refetch } = useGrowthAlerts();

  const byType = (type: string) => alerts.filter((a) => a.type === type);
  const activeAlerts = alerts.filter((a) => a.type !== "info");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Alerts", value: loading ? "…" : activeAlerts.length, color: "bg-red-50 text-red-700", icon: AlertTriangle },
          { label: "Successes", value: loading ? "…" : byType("success").length, color: "bg-green-50 text-green-700", icon: CheckCircle },
          { label: "Warnings", value: loading ? "…" : byType("warning").length, color: "bg-amber-50 text-amber-700", icon: AlertTriangle },
          { label: "Info", value: loading ? "…" : byType("info").length, color: "bg-blue-50 text-blue-700", icon: Zap },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{k.label}</p>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-12 bg-surface-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-surface-900">{k.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* All alerts — real from DB */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
            Live Alerts — Generated from DB
          </p>
          <button onClick={refetch}
            className="flex items-center gap-1 text-xs text-surface-500 hover:text-brand-700 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))
          ) : alerts.length > 0 ? (
            alerts.map((a) => {
              const cls = a.type === "success" ? "border-green-200 bg-green-50" :
                a.type === "error" ? "border-red-200 bg-red-50" :
                a.type === "warning" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";
              const Icon = a.type === "success" ? CheckCircle :
                a.type === "error" ? AlertTriangle :
                a.type === "warning" ? AlertTriangle : Zap;
              const ic = a.type === "success" ? "text-green-600" :
                a.type === "error" ? "text-red-600" :
                a.type === "warning" ? "text-amber-600" : "text-blue-600";
              return (
                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border ${cls}`}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ic}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800">{a.message}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm text-surface-400">
              No alerts generated yet
            </div>
          )}
        </div>
      </div>

      {/* Alert configuration */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Alert Rules (Auto-configured)
        </p>
        <div className="space-y-2">
          {[
            { rule: "Traffic drops >20% vs same time yesterday", channel: "DB alert", status: "active" },
            { rule: "Traffic spikes >50% vs yesterday", channel: "DB alert", status: "active" },
            { rule: "New user registrations today", channel: "DB alert", status: "active" },
            { rule: "Platform redirect count today", channel: "DB alert", status: "active" },
            { rule: "Search query count today", channel: "DB alert", status: "active" },
            { rule: "User milestone reached (100, 500, 1K, 5K…)", channel: "DB alert", status: "active" },
            { rule: "Google Ads ROAS drops below 200%", channel: "Slack + Email (Phase 3)", status: "pending" },
            { rule: "Any keyword drops from position 1–3 to 4+", channel: "Email (Phase 2 GSC)", status: "pending" },
            { rule: "Price scraping failure for any platform >2hr", channel: "Slack + Email", status: "pending" },
          ].map((r) => (
            <div key={r.rule} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-xs font-semibold text-surface-800">{r.rule}</p>
                <p className="text-xs text-surface-400 mt-0.5">→ {r.channel}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                r.status === "active" ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"
              }`}>
                {r.status === "active" ? "✓ Active" : "⏳ Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
