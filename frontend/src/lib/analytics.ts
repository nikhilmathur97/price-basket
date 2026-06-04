/**
 * GA4 event tracking utility
 * ===========================
 * Wraps window.gtag with typed helpers so every key user action
 * is tracked consistently. All calls are no-ops when GA_ID is not
 * set (local dev / no consent) — never throws.
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track.search("amul milk");
 *   track.priceCompare("prod-123", "Blinkit");
 *   track.signup("email");
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

function event(name: string, params?: Record<string, unknown>) {
  gtag("event", name, params ?? {});
}

export const track = {
  /** User typed a search query */
  search(query: string) {
    event("search", { search_term: query });
  },

  /** User viewed price comparison for a product */
  priceCompare(productId: string, platform?: string) {
    event("price_compare", { product_id: productId, platform: platform ?? "all" });
  },

  /** User set a price alert */
  alertSet(productId: string, targetPrice: number) {
    event("alert_set", { product_id: productId, target_price: targetPrice });
  },

  /** User clicked "Buy on [platform]" */
  buyClick(platform: string, productId: string, price?: number) {
    event("buy_click", { platform, product_id: productId, price });
  },

  /** User added item to cart */
  addToCart(productId: string, productName: string, price?: number) {
    event("add_to_cart", {
      items: [{ item_id: productId, item_name: productName, price }],
    });
  },

  /** User ran cart optimizer */
  cartOptimize(strategy: string, savings?: number) {
    event("cart_optimize", { strategy, savings });
  },

  /** User completed signup */
  signup(method: "email" | "google") {
    event("sign_up", { method });
  },

  /** User completed login */
  login(method: "email" | "google") {
    event("login", { method });
  },

  /** User shared a product / deal */
  share(method: string, productId?: string) {
    event("share", { method, content_id: productId });
  },

  /** User clicked WhatsApp / Telegram join CTA */
  joinCommunity(channel: "whatsapp" | "telegram") {
    event("join_community", { channel });
  },

  /** User viewed a blog post */
  blogView(slug: string, title?: string) {
    event("blog_view", { slug, title });
  },

  /** User viewed a compare page */
  compareView(matchup: string) {
    event("compare_view", { matchup });
  },

  /** Generic page-level event */
  pageView(path: string) {
    event("page_view", { page_path: path });
  },
};
