/**
 * GrowthData.ts — Real API hooks for the Growth Dashboard
 *
 * Phase 1: /api/v1/growth/metrics + /live + /alerts  → real DB data
 * Phase 2: /api/v1/growth/google                     → GA4 + GSC + PageSpeed
 * Phase 3: /api/v1/growth/social + /ads              → Social + Google Ads
 *
 * Each exported hook replaces the old static constant.
 * Static fallbacks are used while loading so the UI never breaks.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveData {
  active_visitors: number;
  pageviews_today: number;
  pageviews_yesterday: number;
  revenue_today: number;
  top_product_now: string;
  top_cities: { city: string; visitors: number }[];
}

export interface GrowthMetrics {
  sessions: number;
  sessions_prev: number;
  users: number;
  new_users: number;
  returning_users: number;
  avg_session_duration: number;
  bounce_rate: number;
  bounce_rate_prev: number;
  pages_per_session: number;
  conversion_rate: number;
  revenue: number;
  pageviews: number;
  cart_adds: number;
  platform_redirects: number;
}

export interface TopPage {
  page: string;
  views: number;
  avg_time: number;
  bounce: number;
}

export interface SeoKeyword {
  keyword: string;
  position: number;
  prev: number;
  volume: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface Alert {
  id: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
  time: string;
}

export interface SocialPlatform {
  platform: string;
  followers: number;
  delta: number;
  reach: number;
  impressions: number;
  er: number;
  top: string;
  color: string;
  bg: string;
  configured?: boolean;
}

export interface AdsCampaign {
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  budget: number;
}

export interface TrafficSource {
  source: string;
  sessions: number;
  pct: number;
  trend: "up" | "down" | "flat";
  color: string;
}

// ─── Static fallbacks (shown while loading) ───────────────────────────────────

export const LIVE0: LiveData = {
  active_visitors: 0,
  pageviews_today: 0,
  pageviews_yesterday: 0,
  revenue_today: 0,
  top_product_now: "Loading…",
  top_cities: [],
};

export const GROWTH_FALLBACK: GrowthMetrics = {
  sessions: 0, sessions_prev: 0, users: 0, new_users: 0, returning_users: 0,
  avg_session_duration: 0, bounce_rate: 0, bounce_rate_prev: 0,
  pages_per_session: 0, conversion_rate: 0, revenue: 0,
  pageviews: 0, cart_adds: 0, platform_redirects: 0,
};

// ─── Hook: Phase 1 — DB metrics (sessions, searches, top pages) ───────────────

export function useGrowthMetrics(days: number = 7) {
  const [data, setData] = useState<{
    growth: GrowthMetrics;
    live: LiveData;
    top_pages: TopPage[];
    top_searches: string[];
    platform_clicks: { platform: string; clicks: number }[];
    top_products: { name: string; brand: string; views: number }[];
    source: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/growth/metrics?days=${days}`);
      setData(res.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Hook: Phase 1 — Live visitor count (polls every 30s) ────────────────────

export function useLiveStats() {
  const [live, setLive] = useState<LiveData>(LIVE0);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await apiClient.get("/growth/live");
      setLive(res.data);
    } catch {
      // silently keep last value
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 30_000);
    return () => clearInterval(id);
  }, [fetchLive]);

  return { live, loading, refetch: fetchLive };
}

// ─── Hook: Phase 1 — DB-driven alerts ────────────────────────────────────────

export function useGrowthAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await apiClient.get("/growth/alerts");
      setAlerts(res.data.alerts ?? []);
    } catch {
      setAlerts([{
        id: "error", type: "error",
        message: "⚠️ Could not load alerts — check backend connection",
        time: "Now",
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { alerts, loading, refetch: fetch };
}

// ─── Hook: Phase 2 — Google (GA4 + GSC + PageSpeed) ─────────────────────────

export function useGoogleMetrics(days: number = 7) {
  const [data, setData] = useState<{
    ga4: any;
    gsc: any;
    pagespeed: any;
    credentials_configured: boolean;
    setup_hint?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/growth/google?days=${days}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  return { data, loading };
}

// ─── Hook: Phase 3 — Social (Instagram + Twitter + YouTube) ──────────────────

export function useSocialMetrics() {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    apiClient.get("/growth/social")
      .then(r => {
        setPlatforms(r.data.platforms ?? []);
        setConfigured(r.data.configured ?? false);
      })
      .catch(() => setPlatforms([]))
      .finally(() => setLoading(false));
  }, []);

  return { platforms, loading, configured };
}

// ─── Hook: Phase 3 — Google Ads ──────────────────────────────────────────────

export function useAdsMetrics() {
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    apiClient.get("/growth/ads")
      .then(r => {
        setCampaigns(r.data.ads?.campaigns ?? []);
        setConfigured(r.data.ads?.configured ?? false);
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  return { campaigns, loading, configured };
}

// ─── Static fallback data (used when APIs not yet configured) ─────────────────
// These are kept as named exports so existing tab imports don't break.
// Tabs should prefer the hooks above; these are last-resort fallbacks.

export const GROWTH = GROWTH_FALLBACK;

export const SEO_KEYWORDS: SeoKeyword[] = [
  { keyword: "blinkit vs zepto price comparison", position: 1, prev: 2, volume: 22000, clicks: 1840, impressions: 28400, ctr: 6.5 },
  { keyword: "cheapest grocery app india", position: 2, prev: 3, volume: 18500, clicks: 1240, impressions: 22100, ctr: 5.6 },
  { keyword: "grocery price comparison india", position: 1, prev: 1, volume: 14200, clicks: 980, impressions: 18700, ctr: 5.2 },
  { keyword: "zepto vs bigbasket", position: 3, prev: 5, volume: 9800, clicks: 720, impressions: 14200, ctr: 5.1 },
  { keyword: "blinkit price check", position: 2, prev: 2, volume: 8400, clicks: 640, impressions: 12800, ctr: 5.0 },
  { keyword: "swiggy instamart vs blinkit", position: 4, prev: 7, volume: 7200, clicks: 480, impressions: 11400, ctr: 4.2 },
  { keyword: "grocery deals delhi today", position: 6, prev: 12, volume: 5600, clicks: 320, impressions: 9800, ctr: 3.3 },
  { keyword: "cheapest atta online india", position: 3, prev: 4, volume: 4800, clicks: 290, impressions: 8200, ctr: 3.5 },
  { keyword: "grocery price tracker india", position: 5, prev: 8, volume: 4200, clicks: 240, impressions: 7400, ctr: 3.2 },
  { keyword: "pricebasket.in", position: 1, prev: 1, volume: 3800, clicks: 2100, impressions: 3900, ctr: 53.8 },
];

export const ALERTS: Alert[] = [];

export const ADS: AdsCampaign[] = [];

export const SOCIAL: SocialPlatform[] = [
  { platform: "Instagram", followers: 0, delta: 0, reach: 0, impressions: 0, er: 0, top: "—", color: "text-pink-600", bg: "bg-pink-50" },
  { platform: "Twitter/X", followers: 0, delta: 0, reach: 0, impressions: 0, er: 0, top: "—", color: "text-sky-600", bg: "bg-sky-50" },
  { platform: "YouTube", followers: 0, delta: 0, reach: 0, impressions: 0, er: 0, top: "—", color: "text-red-600", bg: "bg-red-50" },
];

export const TRAFFIC_SOURCES: TrafficSource[] = [
  { source: "Organic Search (SEO)", sessions: 0, pct: 0, trend: "flat", color: "bg-green-500" },
  { source: "Google Ads", sessions: 0, pct: 0, trend: "flat", color: "bg-blue-500" },
  { source: "Instagram", sessions: 0, pct: 0, trend: "flat", color: "bg-pink-500" },
  { source: "Direct", sessions: 0, pct: 0, trend: "flat", color: "bg-surface-400" },
  { source: "Twitter/X", sessions: 0, pct: 0, trend: "flat", color: "bg-sky-500" },
];

export const TOP_PAGES: TopPage[] = [];
export const TOP_SEARCHES: string[] = [];

export const SCHEDULED_POSTS = [
  { platform: "Instagram", time: "Today 8:00 AM", content: "Atta price drop alert! 🔥 Save ₹51 on JioMart vs Blinkit" },
  { platform: "Twitter/X", time: "Today 11:00 AM", content: "🚨 PRICE DROP: Aashirvaad Atta 5kg just dropped to ₹189 on JioMart!" },
  { platform: "Instagram", time: "Today 1:00 PM", content: "Weekly deal carousel: Top 5 savings this week 💰" },
  { platform: "YouTube", time: "Tomorrow 10:00 AM", content: "Blinkit vs Zepto vs BigBasket — full price war analysis" },
  { platform: "Twitter/X", time: "Tomorrow 2:00 PM", content: "🧵 How to save ₹800/month on groceries (thread)" },
];
