"use client";
import { useSocialMetrics, SCHEDULED_POSTS } from "../GrowthData";

export function SocialTab() {
  const { platforms, loading, configured } = useSocialMetrics();

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Phase 3 Social APIs not configured.</strong> Set{" "}
          <code className="bg-amber-100 px-1 rounded">INSTAGRAM_ACCESS_TOKEN</code>,{" "}
          <code className="bg-amber-100 px-1 rounded">TWITTER_BEARER_TOKEN</code>,{" "}
          <code className="bg-amber-100 px-1 rounded">YOUTUBE_API_KEY</code> env vars.
          See <code className="bg-amber-100 px-1 rounded">growth/automation/master-guide.md</code>.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 w-24 bg-surface-100 rounded mb-4" />
                <div className="h-8 w-20 bg-surface-100 rounded mb-2" />
                <div className="h-3 w-16 bg-surface-100 rounded" />
              </div>
            ))
          : platforms.map((s) => (
              <div key={s.platform} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-sm font-black ${s.color}`}>{s.platform}</p>
                  {s.configured ? (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ Live
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Not configured
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-surface-900">
                  {s.followers > 0 ? s.followers.toLocaleString("en-IN") : "—"}
                </p>
                <p className="text-xs text-surface-400 mb-4">followers</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className={`rounded-xl p-2 ${s.bg}`}>
                    <p className="text-sm font-black text-surface-900">
                      {s.reach > 0 ? `${(s.reach / 1000).toFixed(0)}K` : "—"}
                    </p>
                    <p className="text-xs text-surface-500">Reach</p>
                  </div>
                  <div className={`rounded-xl p-2 ${s.bg}`}>
                    <p className="text-sm font-black text-surface-900">
                      {s.er > 0 ? `${s.er}%` : "—"}
                    </p>
                    <p className="text-xs text-surface-500">Eng. Rate</p>
                  </div>
                </div>
                {s.top && s.top !== "—" && (
                  <div className="mt-3 p-2 bg-surface-50 rounded-xl">
                    <p className="text-xs text-surface-400 mb-0.5">Top post this week</p>
                    <p className="text-xs font-semibold text-surface-700 line-clamp-2">{s.top}</p>
                  </div>
                )}
              </div>
            ))}
      </div>

      <div className="card p-5">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">
          Scheduled Posts — Next 7 Days
        </p>
        <div className="space-y-2">
          {SCHEDULED_POSTS.map((p, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-surface-50 rounded-xl">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                p.platform === "Instagram" ? "bg-pink-100 text-pink-700" :
                p.platform === "Twitter/X" ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-700"
              }`}>
                {p.platform}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-700 truncate">{p.content}</p>
                <p className="text-xs text-surface-400 mt-0.5">{p.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">
            Influencer Campaign Tracker
          </p>
          <div className="space-y-2">
            {[
              { name: "@savingswithriya", platform: "Instagram", followers: "48K", reach: "1.2L", clicks: 840, status: "live" },
              { name: "@groceryhacksindia", platform: "Instagram", followers: "22K", reach: "54K", clicks: 420, status: "live" },
              { name: "@budgetfoodie", platform: "YouTube", followers: "85K", reach: "2.4L", clicks: 1240, status: "pending" },
              { name: "@delhifoodie", platform: "Twitter/X", followers: "31K", reach: "78K", clicks: 320, status: "completed" },
            ].map((inf) => (
              <div key={inf.name} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-surface-800">{inf.name}</p>
                  <p className="text-xs text-surface-400">{inf.platform} · {inf.followers} followers</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-600">{inf.clicks} clicks</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    inf.status === "live" ? "bg-green-50 text-green-700" :
                    inf.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-surface-100 text-surface-500"
                  }`}>
                    {inf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">
            WhatsApp Viral Loop Stats
          </p>
          <div className="space-y-3">
            {[
              { label: "Deals Shared via WhatsApp", value: "—", trend: "" },
              { label: "WhatsApp Subscribers", value: "—", trend: "" },
              { label: "Avg Shares per Deal", value: "—", trend: "" },
              { label: "Viral Coefficient", value: "—", trend: "" },
            ].map((w) => (
              <div key={w.label} className="flex items-center justify-between">
                <span className="text-sm text-surface-700">{w.label}</span>
                <span className="text-sm font-black text-surface-400">{w.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-3">Connect WhatsApp Business API to track sharing metrics</p>
        </div>
      </div>
    </div>
  );
}
