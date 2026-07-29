"use client";

import { useEffect, useState } from "react";
import { Gift, Coins, Users, Award } from "lucide-react";
import { apiClient } from "@/services/api";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  coins_balance: number;
  current_streak_days: number;
}

interface Stats {
  total_coins_distributed: number;
  referral_codes_generated: number;
  referrals_redeemed: number;
  referrals_rewarded: number;
}

export default function LoyaltyPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [lb, st] = await Promise.all([
          apiClient.get(`/loyalty/leaderboard`, { params: { limit: 20 } }),
          apiClient.get(`/loyalty/stats`),
        ]);
        setLeaderboard(lb.data.items ?? []);
        setStats(st.data);
      } catch {
        setError("Could not load referral & loyalty data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-surface-900 flex items-center gap-2">
          <Gift className="w-5 h-5 text-brand-600" />
          Referral &amp; Loyalty AI
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Coins, streaks, badges, and the referral funnel — derived from existing user activity.
        </p>
      </div>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="card p-4 h-20 bg-surface-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Coins Distributed</p>
              </div>
              <p className="text-2xl font-black text-surface-900">{stats?.total_coins_distributed ?? 0}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-brand-600" />
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Codes Generated</p>
              </div>
              <p className="text-2xl font-black text-surface-900">{stats?.referral_codes_generated ?? 0}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Redeemed</p>
              </div>
              <p className="text-2xl font-black text-surface-900">{stats?.referrals_redeemed ?? 0}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-green-600" />
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Rewarded</p>
              </div>
              <p className="text-2xl font-black text-surface-900">{stats?.referrals_rewarded ?? 0}</p>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-3">Leaderboard</p>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-surface-500">No loyalty accounts yet.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div key={entry.user_id} className="flex items-center justify-between text-sm py-2 border-b border-surface-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-black text-surface-400">{i + 1}</span>
                      <span className="text-surface-800 font-semibold">{entry.full_name ?? "Anonymous"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-surface-400">🔥 {entry.current_streak_days}d streak</span>
                      <span className="text-sm font-bold text-amber-600">{entry.coins_balance} coins</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
