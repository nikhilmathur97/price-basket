"use client";
import { Target, DollarSign, Eye, ArrowUpRight } from "lucide-react";
import { useAdsMetrics } from "../GrowthData";

function RoasGauge({ roas }: { roas: number }) {
  const pct = Math.min(100, (roas / 800) * 100);
  const color = roas >= 400 ? "bg-green-500" : roas >= 200 ? "bg-amber-500" : "bg-red-500";
  const text = roas >= 400 ? "text-green-700" : roas >= 200 ? "text-amber-700" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-12 text-right ${text}`}>{roas}%</span>
    </div>
  );
}

export function AdsTab() {
  const { campaigns, loading, configured } = useAdsMetrics();

  const totalSpend = campaigns.reduce((s, a) => s + a.spend, 0);
  const totalClicks = campaigns.reduce((s, a) => s + a.clicks, 0);
  const totalImpressions = campaigns.reduce((s, a) => s + a.impressions, 0);
  const avgRoas = campaigns.length > 0
    ? Math.round(campaigns.reduce((s, a) => s + a.roas, 0) / campaigns.length)
    : 0;

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Phase 3 Google Ads API not configured.</strong> Set{" "}
          <code className="bg-amber-100 px-1 rounded">GOOGLE_ADS_CUSTOMER_ID</code> and configure{" "}
          <code className="bg-amber-100 px-1 rounded">google-ads.yaml</code>.
          See <code className="bg-amber-100 px-1 rounded">growth/automation/master-guide.md</code>.
          Install: <code className="bg-amber-100 px-1 rounded">pip install google-ads</code>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Ad Spend", value: loading ? "…" : `₹${totalSpend.toLocaleString("en-IN")}`, icon: DollarSign, color: "bg-red-50 text-red-700" },
          { label: "Total Impressions", value: loading ? "…" : totalImpressions.toLocaleString("en-IN"), icon: Eye, color: "bg-blue-50 text-blue-700" },
          { label: "Total Clicks", value: loading ? "…" : totalClicks.toLocaleString("en-IN"), icon: ArrowUpRight, color: "bg-green-50 text-green-700" },
          { label: "Avg ROAS", value: loading ? "…" : avgRoas > 0 ? `${avgRoas}%` : "—", icon: Target, color: avgRoas >= 400 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{k.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-surface-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-surface-900">{k.value}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Campaign Performance {configured ? "— Live from Google Ads" : "— Configure Google Ads API for live data"}
        </p>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
            ))}
          </div>
        ) : campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-surface-400 border-b border-surface-100">
                  <th className="pb-2 pr-4">Campaign</th>
                  <th className="pb-2 pr-4 text-right">Spend</th>
                  <th className="pb-2 pr-4 text-right">Clicks</th>
                  <th className="pb-2 pr-4 text-right">CTR</th>
                  <th className="pb-2 pr-4">ROAS</th>
                  <th className="pb-2 text-right">Budget Used</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((a) => (
                  <tr key={a.campaign} className="border-b border-surface-50 last:border-0 hover:bg-surface-50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-surface-800">{a.campaign}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-surface-900">
                      ₹{a.spend.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-surface-700">
                      {a.clicks.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${a.ctr >= 5 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {a.ctr}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 w-36">
                      <RoasGauge roas={a.roas} />
                    </td>
                    <td className="py-2.5 text-right">
                      {a.budget > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.round((a.spend / a.budget) * 100))}%` }} />
                          </div>
                          <span className="text-xs text-surface-500">
                            {Math.round((a.spend / a.budget) * 100)}%
                          </span>
                        </div>
                      ) : <span className="text-xs text-surface-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Target className="w-10 h-10 text-surface-200 mx-auto mb-3" />
            <p className="text-sm text-surface-400">No campaign data yet</p>
            <p className="text-xs text-surface-300 mt-1">Configure Google Ads API to see live campaign performance</p>
          </div>
        )}
      </div>

      {/* Campaign structure guide */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Recommended Campaign Structure (from master-guide.md)
        </p>
        <div className="space-y-2">
          {[
            { name: "Brand Keywords", budget: "₹500/day", status: "Setup needed", color: "bg-blue-50 text-blue-700" },
            { name: "Competitor Keywords", budget: "₹800/day", status: "Setup needed", color: "bg-violet-50 text-violet-700" },
            { name: "Generic Grocery", budget: "₹1,200/day", status: "Setup needed", color: "bg-green-50 text-green-700" },
            { name: "City Targeting", budget: "₹600/day", status: "Setup needed", color: "bg-amber-50 text-amber-700" },
            { name: "Remarketing", budget: "₹400/day", status: "Setup needed", color: "bg-red-50 text-red-700" },
          ].map((c) => (
            <div key={c.name} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.color}`}>{c.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-surface-500">{c.budget}</span>
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
