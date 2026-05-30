// Static mock data for Growth Dashboard
// Replace with real GA4 + GSC + Ads API calls in production

export const LIVE0 = {
  active_visitors: 847,
  pageviews_today: 12430,
  pageviews_yesterday: 10820,
  revenue_today: 18450,
  top_product_now: "Aashirvaad Atta 5kg",
  top_cities: [
    { city: "Mumbai", visitors: 234 },
    { city: "Delhi", visitors: 198 },
    { city: "Bangalore", visitors: 167 },
    { city: "Hyderabad", visitors: 112 },
    { city: "Pune", visitors: 89 },
    { city: "Chennai", visitors: 47 },
  ],
};

export const GROWTH = {
  sessions: 84320,
  sessions_prev: 71200,
  users: 62180,
  new_users: 41300,
  returning_users: 20880,
  avg_session_duration: 187,
  bounce_rate: 38.4,
  bounce_rate_prev: 42.1,
  pages_per_session: 4.2,
  conversion_rate: 6.8,
  revenue: 124500,
};

export const SEO_KEYWORDS = [
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

export const ALERTS = [
  { id: "1", type: "success" as const, message: "🚀 Viral spike: Instagram Reel got 48K views (12x normal)", time: "2 min ago" },
  { id: "2", type: "warning" as const, message: "⚠️ Traffic drop 18% vs yesterday between 2–4pm IST", time: "1 hr ago" },
  { id: "3", type: "success" as const, message: "✅ Keyword 'grocery deals delhi today' jumped from #12 → #6", time: "3 hr ago" },
  { id: "4", type: "error" as const, message: "🔴 Zepto scraper failed — prices may be stale (>2hr)", time: "4 hr ago" },
  { id: "5", type: "info" as const, message: "📊 Weekly report ready: 18.4% session growth vs last week", time: "6 hr ago" },
  { id: "6", type: "success" as const, message: "💰 Google Ads ROAS hit 520% — above 400% target", time: "8 hr ago" },
];

export const ADS = [
  { campaign: "Performance Max", spend: 4200, impressions: 184000, clicks: 8420, ctr: 4.6, roas: 520, budget: 6000 },
  { campaign: "Search — Comparison", spend: 2800, impressions: 92000, clicks: 5240, ctr: 5.7, roas: 480, budget: 4000 },
  { campaign: "Search — Deals", spend: 1900, impressions: 64000, clicks: 3120, ctr: 4.9, roas: 390, budget: 3000 },
  { campaign: "Remarketing 30-day", spend: 1200, impressions: 48000, clicks: 2840, ctr: 5.9, roas: 620, budget: 2000 },
  { campaign: "Competitor Targeting", spend: 980, impressions: 38000, clicks: 1920, ctr: 5.1, roas: 340, budget: 1500 },
];

export const SOCIAL = [
  { platform: "Instagram", followers: 48200, delta: 1840, reach: 284000, impressions: 412000, er: 6.8, top: "Atta ₹51 cheaper on JioMart vs Blinkit 🔥", color: "text-pink-600", bg: "bg-pink-50" },
  { platform: "Twitter/X", followers: 22400, delta: 680, reach: 124000, impressions: 218000, er: 4.2, top: "🧵 I compared grocery prices across 6 apps for 30 days...", color: "text-sky-600", bg: "bg-sky-50" },
  { platform: "YouTube", followers: 18700, delta: 420, reach: 84000, impressions: 142000, er: 5.1, top: "I tested ALL grocery delivery apps for 30 days — the results shocked me", color: "text-red-600", bg: "bg-red-50" },
];

export const TRAFFIC_SOURCES = [
  { source: "Organic Search (SEO)", sessions: 38240, pct: 45.3, trend: "up", color: "bg-green-500" },
  { source: "Google Ads", sessions: 18420, pct: 21.8, trend: "up", color: "bg-blue-500" },
  { source: "Instagram", sessions: 9840, pct: 11.7, trend: "up", color: "bg-pink-500" },
  { source: "Direct", sessions: 7620, pct: 9.0, trend: "flat", color: "bg-surface-400" },
  { source: "Twitter/X", sessions: 4280, pct: 5.1, trend: "up", color: "bg-sky-500" },
  { source: "YouTube", sessions: 3140, pct: 3.7, trend: "up", color: "bg-red-500" },
  { source: "Referral", sessions: 2780, pct: 3.3, trend: "down", color: "bg-violet-500" },
];

export const TOP_PAGES = [
  { page: "/", views: 28400, avg_time: 142, bounce: 32 },
  { page: "/search", views: 18200, avg_time: 198, bounce: 24 },
  { page: "/product/aashirvaad-atta-5kg", views: 8400, avg_time: 224, bounce: 18 },
  { page: "/compare/blinkit-vs-zepto", views: 6200, avg_time: 312, bounce: 14 },
  { page: "/best-grocery-deals", views: 4800, avg_time: 186, bounce: 28 },
  { page: "/grocery-prices-mumbai", views: 3400, avg_time: 164, bounce: 36 },
];

export const TOP_SEARCHES = [
  "atta price comparison",
  "zepto vs blinkit",
  "cheapest oil online",
  "grocery deals today",
  "bigbasket vs jiomart",
  "rice price comparison",
];

export const SCHEDULED_POSTS = [
  { platform: "Instagram", time: "Today 8:00 AM", content: "Atta price drop alert! 🔥 Save ₹51 on JioMart vs Blinkit" },
  { platform: "Twitter/X", time: "Today 11:00 AM", content: "🚨 PRICE DROP: Aashirvaad Atta 5kg just dropped to ₹189 on JioMart!" },
  { platform: "Instagram", time: "Today 1:00 PM", content: "Weekly deal carousel: Top 5 savings this week 💰" },
  { platform: "YouTube", time: "Tomorrow 10:00 AM", content: "Blinkit vs Zepto vs BigBasket — full price war analysis" },
  { platform: "Twitter/X", time: "Tomorrow 2:00 PM", content: "🧵 How to save ₹800/month on groceries (thread)" },
];
