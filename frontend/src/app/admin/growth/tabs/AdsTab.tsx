"use client";
import { Target, DollarSign, Eye, ArrowUpRight } from "lucide-react";
import { ADS } from "../GrowthData";

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
  const totalSpend = ADS.reduce((s, a) => s + a.spend, 0);
  const totalClicks = ADS.reduce((s, a) => s + a.clicks, 0);
  const totalImpressions = ADS.reduce((s, a) => s + a.impressions, 0);
  const avgRoas = Math.round(ADS.reduce((s, a) => s + a.roas, 0) / ADS.length);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Ad Spend", value: `₹${totalSpend.toLocaleString("en-IN")}`, icon: DollarSign, color: "bg-red-50 text-red-700" },
          { label: "Total Impressions", value: totalImpressions.toLocaleString("en-IN"), icon: Eye, color: "bg-blue-50 text-blue-700" },
          { label: "Total Clicks", value: totalClicks.toLocaleString("en-IN"), icon: ArrowUpRight, color: "bg-green-50 text-green-700" },
          { label: "Avg ROAS", value: `${avgRoas}%`, icon: Target, color: avgRoas >= 400 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700" },
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
              <p className="text-2xl font-black text-surface-900">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Campaigns table */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Campaign Performance
        </p>
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
              {ADS.map((a) => (
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
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${Math.round((a.spend / a.budget) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-surface-500">
                        {Math.round((a.spend / a.budget) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top converting keywords */}
      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Top 10 Converting Keywords
        </p>
        <div className="space-y-2">
          {[
            { kw: "blinkit vs zepto price", conversions: 284, cpc: 18, conv_rate: 8.4 },
            { kw: "cheapest grocery app india", conversions: 218, cpc: 22, conv_rate: 7.2 },
            { kw: "grocery price comparison", conversions: 196, cpc: 16, conv_rate: 9.1 },
            { kw: "zepto vs bigbasket", conversions: 164, cpc: 20, conv_rate: 6.8 },
            { kw: "blinkit price check", conversions: 142, cpc: 14, conv_rate: 7.9 },
            { kw: "grocery deals today", conversions: 128, cpc: 12, conv_rate: 8.2 },
            { kw: "swiggy instamart vs blinkit", conversions: 112, cpc: 24, conv_rate: 6.4 },
            { kw: "cheapest atta online", conversions: 98, cpc: 10, conv_rate: 9.8 },
            { kw: "grocery price tracker", conversions: 84, cpc: 18, conv_rate: 7.1 },
            { kw: "bigbasket vs jiomart", conversions: 76, cpc: 16, conv_rate: 6.9 },
          ].map((k, i) => (
            <div key={k.kw} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
              <span className="text-xs font-bold text-surface-400 w-5 text-center">{i + 1}</span>
              <span className="text-sm text-surface-700 flex-1 truncate">{k.kw}</span>
              <span className="text-xs text-surface-500 flex-shrink-0">₹{k.cpc} CPC</span>
              <span className="text-xs font-bold text-green-700 flex-shrink-0">{k.conversions} conv.</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${k.conv_rate >= 8 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {k.conv_rate}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
