/**
 * Axios API client with automatic JWT injection and token refresh.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import type { ProductWithPrices } from "@/types";

// Browser API calls go through the Vercel proxy (/api/v1/*) by default.
// Set NEXT_PUBLIC_API_URL in Vercel env vars to the AWS ALB for direct browser→ALB calls.
// Empty string means "use relative URLs" → goes through Vercel proxy → ALB.
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";

export const apiClient = axios.create({
  baseURL: `${BACKEND}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token ──────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Guest session
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("pb_session_id") : null;
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
    if (error.response?.status === 401 && !original._retry) {
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
  // Auth
  register: (data: { email: string; password: string; full_name: string }) =>
    apiClient.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login", data),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get("/auth/me"),
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
  getFeatured: (limit = 20) => apiClient.get(`/products/featured?limit=${limit}`),
  searchProducts: (params: Record<string, string | number>) =>
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
  optimizeCart: () => apiClient.get("/cart/optimize"),

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
  getAdminDailyLogins: (days = 7) => apiClient.get(`/admin/logins/daily?days=${days}`),
  getAdminPayments: () => apiClient.get("/admin/payments"),
  getAdminQueries: () => apiClient.get("/admin/queries"),
  getAdminPlatforms: () => apiClient.get("/admin/platforms"),
  setAdminPlatformActive: (platformId: string, isActive: boolean) =>
    apiClient.patch(`/admin/platforms/${platformId}?is_active=${isActive}`),
  getAdminDbOverview: () => apiClient.get("/admin/db-overview"),
  getAdminCatalog: () => apiClient.get("/admin/catalog"),
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
