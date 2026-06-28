/**
 * Axios API client with automatic JWT injection and token refresh.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import type { ProductSearchResult, ProductWithPrices, FlatOptimizationResult } from "@/types";

// Browser API calls go through the Vercel proxy (/api/v1/*) by default.
// Set NEXT_PUBLIC_API_URL in Vercel env vars to the AWS ALB for direct browser→ALB calls.
// Empty string means "use relative URLs" → goes through Next.js proxy → backend.
// In local dev without NEXT_PUBLIC_API_URL set, relative URLs hit the Next.js dev
// server which proxies to the backend via app/api/v1/[...path]/route.ts.
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = axios.create({
  baseURL: `${BACKEND}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/**
 * Get or generate a persistent guest session ID stored in localStorage.
 * Used for anonymous user tracking via the X-Session-ID header.
 * Safe to call on server (returns empty string — header is simply omitted).
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("pb_session_id");
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("pb_session_id", id);
  }
  return id;
}

// ── Request interceptor: attach access token + guest session ID ───────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Always attach (or generate) the guest session ID so the backend can track
  // anonymous users. getSessionId() creates and persists a UUID on first call.
  const sessionId = getSessionId();
  if (sessionId) {
    config.headers["X-Session-ID"] = sessionId;
  }
  return config;
});

// ── Response interceptor: handle 401 with token refresh ───────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    // Never intercept 401s from auth endpoints themselves — login/register returning
    // 401 means wrong credentials, not an expired session. Intercepting these causes
    // the refresh cycle to run, then logout() to fire, which corrupts the login flow.
    const url = original?.url ?? "";
    const isAuthEndpoint = /\/auth\/(login|login-email|register|refresh|verify-signup-otp|reset-password)/.test(url);
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        // Use apiClient (relative baseURL) so this works with both direct ALB
        // and Vercel proxy — avoids hardcoded Render/ALB URL here.
        const { data } = await apiClient.post(
          "/auth/refresh",
          {},
          { withCredentials: true }
        );
        // Guard: if the user explicitly logged out while this refresh was in-flight
        // (user === null), do NOT apply the new token. Without this, any background
        // API call (cart, alerts, etc.) that triggered a 401 → refresh cycle would
        // call setAccessToken() after logout, setting isAuthenticated=true, which
        // immediately fires the login page's redirect effect → "button not working".
        if (useAuthStore.getState().user === null) {
          refreshQueue = [];
          return Promise.reject(error);
        }
        useAuthStore.getState().setAccessToken(data.access_token);
        refreshQueue.forEach((cb) => cb(data.access_token));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── API helpers ────────────────────────────────────────────────────────────────

export const api = {
  // ── Mobile auth (primary) ────────────────────────────────────────────────
  sendSignupOtp: (mobile_number: string) =>
    apiClient.post("/auth/send-signup-otp", { mobile_number }),
  verifySignupOtp: (data: {
    mobile_number: string;
    otp: string;
    full_name: string;
    password: string;
    email?: string;
  }) => apiClient.post("/auth/verify-signup-otp", data),
  login: (data: { mobile_number: string; password: string }) =>
    apiClient.post("/auth/login", data),
  sendForgotPasswordOtp: (mobile_number: string) =>
    apiClient.post("/auth/send-forgot-password-otp", { mobile_number }),
  resetPasswordMobile: (data: {
    mobile_number: string;
    otp: string;
    new_password: string;
  }) => apiClient.post("/auth/reset-password-mobile", data),

  // ── Shared ────────────────────────────────────────────────────────────────
  // _retry:true tells the response interceptor to never attempt a token refresh on
  // a 401 from this endpoint.
  logout: () => apiClient.post("/auth/logout", {}, { _retry: true } as any),
  me: () => apiClient.get("/auth/me"),

  // ── Legacy email auth (admin accounts / migration) ─────────────────────
  register: (data: { email: string; password: string; full_name: string }) =>
    apiClient.post("/auth/register", data),
  loginEmail: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login-email", data),
  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    apiClient.post("/auth/reset-password", { token, new_password }),
  updateMe: (data: {
    full_name?: string;
    phone?: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    notification_email?: boolean;
    notification_push?: boolean;
  }) => apiClient.patch("/users/me", data),

  // Products
  getCategories: () => apiClient.get("/products/categories"),
  getFeatured: (limit = 20, signal?: AbortSignal) =>
    apiClient.get(`/products/featured?limit=${limit}`, { signal }),
  /**
   * Search products by text query — calls GET /products/search?q=<query>.
   * Sends X-Session-ID automatically via the request interceptor.
   * Throws AxiosError with status 400 if query is an empty string.
   */
  searchProducts: (query: string, params?: Record<string, string | number>) =>
    apiClient.get<ProductSearchResult>("/products/search", {
      params: { q: query, ...params },
    }),
  /**
   * Full product list/filter endpoint — used for category browse, admin, etc.
   * Accepts arbitrary filter params (category_slug, sort, page, page_size, …).
   */
  listProducts: (params: Record<string, string | number>) =>
    apiClient.get("/products", { params }),
  getProduct: (id: string) => apiClient.get(`/products/${id}`),
  getBulkProducts: (ids: string[]) =>
    apiClient.post<ProductWithPrices[]>("/products/bulk", { ids }),

  // Prices
  getProductPrices: (id: string, forceRefresh = false) =>
    apiClient.get(`/prices/${id}${forceRefresh ? "?force_refresh=true" : ""}`),
  getPriceHistory: (id: string, days = 30) =>
    apiClient.get(`/prices/${id}/history?days=${days}`),

  // Cart
  getCart: () => apiClient.get("/cart"),
  addToCart: (data: { product_id: string; quantity: number; selected_platform_id?: string }) =>
    apiClient.post("/cart/items", data),
  updateCartItem: (id: string, data: { quantity: number; selected_platform_id?: string }) =>
    apiClient.patch(`/cart/items/${id}`, data),
  removeCartItem: (id: string) => apiClient.delete(`/cart/items/${id}`),
  clearCart: () => apiClient.delete("/cart"),
  /** Legacy session-based GET optimize (requires auth + cart in DB) */
  optimizeCartSession: () => apiClient.get("/cart/optimize"),
  /**
   * Stateless POST optimize — works for guests, no auth required.
   * Accepts an array of { product_id, quantity } and returns split recommendations.
   */
  optimizeCart: (items: { product_id: string; quantity: number }[]) =>
    apiClient.post<FlatOptimizationResult>("/cart/optimize", { items }),

  // Price Alerts
  getAlerts: () => apiClient.get("/prices/alerts/me"),
  createAlert: (data: { product_id: string; target_price: number }) =>
    apiClient.post("/prices/alerts", data),
  deleteAlert: (id: string) => apiClient.delete(`/prices/alerts/${id}`),

  // Admin
  getAdminStats: () => apiClient.get("/admin/stats"),
  getAdminUsers: (params?: { limit?: number; offset?: number }) =>
    apiClient.get("/admin/users", { params }),
  getAdminUserCart: (userId: string) => apiClient.get(`/admin/users/${userId}/cart`),
  deleteAdminUser: (userId: string) => apiClient.delete(`/admin/users/${userId}`),
  getAdminDailyLogins: (days = 7) => apiClient.get(`/admin/logins/daily?days=${days}`),
  getAdminPayments: () => apiClient.get("/admin/payments"),
  getAdminQueries: (params?: { status?: string; limit?: number; offset?: number }) =>
    apiClient.get("/admin/queries", { params }),
  updateQueryStatus: (id: string, status: string) =>
    apiClient.patch(`/admin/queries/${id}?status=${encodeURIComponent(status)}`),
  submitContactQuery: (data: {
    name: string; email?: string; mobile?: string; subject: string; message: string;
  }) => apiClient.post("/contact", data),
  getAdminPlatforms: () => apiClient.get("/admin/platforms"),
  setAdminPlatformActive: (platformId: string, isActive: boolean) =>
    apiClient.patch(`/admin/platforms/${platformId}?is_active=${isActive}`),
  getAdminDbOverview: () => apiClient.get("/admin/db-overview"),
  getAdminCatalog: () => apiClient.get("/admin/catalog"),
  fixCatalogMismatches: () => apiClient.post("/admin/catalog/fix-mismatches"),
  searchAdminProducts: (q: string) =>
    apiClient.get(`/admin/products/search?q=${encodeURIComponent(q)}`),
  upsertAmazonPrice: (slug: string, data: {
    price: number; mrp: number; asin: string; image_url?: string; affiliate_link: string;
  }) => apiClient.post(`/admin/products/${slug}/amazon`, data),

  // Analytics (admin)
  getAnalyticsStats: (days = 7) => apiClient.get(`/analytics/stats?days=${days}`),
  getClientJourney: (clientId: string) => apiClient.get(`/analytics/client/${clientId}`),

  // Growth dashboard — Phase 1/2/3
  getGrowthMetrics: (days = 7) => apiClient.get(`/growth/metrics?days=${days}`),
  getGrowthLive: () => apiClient.get("/growth/live"),
  getGrowthAlerts: () => apiClient.get("/growth/alerts"),
  getGrowthGoogle: (days = 7) => apiClient.get(`/growth/google?days=${days}`),
  getGrowthSocial: () => apiClient.get("/growth/social"),
  getGrowthAds: () => apiClient.get("/growth/ads"),

  // Marketing agents system
  getMarketingDashboard: () => apiClient.get("/marketing/dashboard/stats"),
  getMarketingContent: (params?: Record<string, string | number>) => apiClient.get("/marketing/content", { params }),
  getMarketingContentById: (id: string) => apiClient.get(`/marketing/content/${id}`),
  updateMarketingContent: (id: string, data: Record<string, unknown>) => apiClient.put(`/marketing/content/${id}`, data),
  deleteMarketingContent: (id: string) => apiClient.delete(`/marketing/content/${id}`),
  getMarketingCampaigns: () => apiClient.get("/marketing/campaigns"),
  createMarketingCampaign: (data: Record<string, unknown>) => apiClient.post("/marketing/campaigns", data),
  logMarketingAnalytics: (data: Record<string, unknown>) => apiClient.post("/marketing/analytics", data),
  getMarketingAnalyticsSummary: (days = 30) => apiClient.get(`/marketing/analytics/summary?days=${days}`),
  getMarketingGoals: (month?: string) => apiClient.get(`/marketing/goals${month ? `?month=${month}` : ""}`),
  setMarketingGoal: (data: Record<string, unknown>) => apiClient.post("/marketing/goals", data),
  updateMarketingGoal: (id: string, currentValue: number) => apiClient.put(`/marketing/goals/${id}`, { current_value: currentValue }),
  getScheduleToday: () => apiClient.get("/marketing/schedule/today"),
  getScheduleWeek: () => apiClient.get("/marketing/schedule/week"),
  createScheduleEntry: (data: Record<string, unknown>) => apiClient.post("/marketing/schedule", data),
  updateScheduleEntry: (id: string, data: Record<string, unknown>) => apiClient.put(`/marketing/schedule/${id}`, data),
  generateUTM: (data: Record<string, unknown>) => apiClient.post("/marketing/utm", data),

  // Scrape (admin)
  getScrapeStatus: () => apiClient.get("/scrape/status"),
  triggerBulkScrape: (data: { queries: string[]; platforms?: string[]; save_to_db?: boolean }) =>
    apiClient.post("/scrape/bulk", data),
  seedFromJson: (data: { file_path?: string; dry_run?: boolean; limit?: number }) =>
    apiClient.post("/scrape/seed-from-json", data),
};

// ── Analytics / event tracking ────────────────────────────────────────────────

/** Get or generate a persistent browser-level client ID (stored in localStorage). */
export function getClientId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("pb_client_id");
  if (!id) {
    // Use crypto.randomUUID when available (all modern browsers)
    id = "pb_" + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");
    localStorage.setItem("pb_client_id", id);
  }
  return id;
}

export interface TrackEventPayload {
  event_type:
    | "product_view"
    | "cart_add"
    | "cart_remove"
    | "platform_redirect"
    | "search"
    | "checkout_start";
  product_id?: string;
  platform_id?: string;
  price_shown?: number;
  cart_item_count?: number;
  search_query?: string;
  referrer_page?: string;
  redirect_url?: string;
}

/**
 * Safely extract a human-readable error message from an Axios error.
 * FastAPI 422 validation errors return `detail` as an array of objects;
 * this always returns a plain string.
 */
export function extractApiError(err: unknown, fallback = "Something went wrong"): string {
  const detail = (err as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    return typeof first?.msg === "string" ? first.msg : fallback;
  }
  return fallback;
}

/**
 * Fire-and-forget event tracker. Never throws — analytics must never block the UI.
 */
export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    const sessionId =
      typeof window !== "undefined" ? localStorage.getItem("pb_session_id") : null;
    await fetch("/api/v1/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        client_id: getClientId(),
        session_id: sessionId ?? undefined,
      }),
    });
  } catch {
    // Intentionally swallowed — analytics must never break the UI.
  }
}
