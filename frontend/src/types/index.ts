/**
 * Shared TypeScript types for the entire frontend.
 */

// ── Flutter WebView bridge ────────────────────────────────────────────────────
// Declared globally so any component can call window.FlutterBridge?.postMessage()
// The Flutter app registers this channel via addJavaScriptChannel('FlutterBridge', ...)
declare global {
  interface Window {
    FlutterBridge?: {
      postMessage: (message: string) => void;
    };
  }
}


export interface Platform {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  color_hex: string | null;
  avg_delivery_minutes: number;
  min_order_amount: number;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  display_order: number;
}

export interface PlatformPrice {
  platform: Platform;
  price: number;
  original_price: number | null;
  discount_percent: number;
  discount_label: string | null;
  is_available: boolean;
  delivery_time_minutes: number | null;
  platform_product_url: string | null;
  platform_image_url: string | null;
  buy_url: string | null;
  last_updated: string;
  source: string | null;  // "scrape" | "estimated" | "cache" | null
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  unit: string | null;
  category: Category | null;
  tags: string[] | null;
  is_featured: boolean;
}

export interface ProductWithPrices extends Product {
  platform_prices: PlatformPrice[];
  cheapest_platform: Platform | null;
  fastest_platform: Platform | null;
  best_value_platform: Platform | null;
  intelligence: {
    normalized_name: string;
    normalized_brand: string | null;
    quantity_value: number | null;
    quantity_unit: string | null;
    variant_signature: string;
    available_platform_count: number;
    total_platform_count: number;
    best_price: number | null;
    highest_price: number | null;
    savings_amount: number;
    price_spread_percent: number;
    recommendation_reason: string | null;
  };
  coverage_summary: {
    available_platform_count: number;
    total_platform_count: number;
    best_eta_minutes: number | null;
    average_eta_minutes: number | null;
    live_offer_count: number;
  };
  affiliate_enabled: boolean;
}

export interface ProductSearchResult {
  total: number;
  page: number;
  page_size: number;
  items: ProductWithPrices[];
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product: Product;
  selected_platform: Platform | null;
  quantity: number;
  snapshot_price: number | null;
  added_at: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  created_at: string;
  updated_at: string;
}

// ── Cart Optimization ─────────────────────────────────────────────────────────

export interface PlatformBundle {
  platform_id: string;
  platform_slug: string;
  platform_name: string;
  platform_color: string;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    platform_product_url: string | null;
  }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  estimated_delivery_minutes: number;
}

export interface OptimizationResult {
  cheapest_single: PlatformBundle;
  fastest_single: PlatformBundle;
  cheapest_split: PlatformBundle[];
  best_value_split: PlatformBundle[];
  savings_vs_most_expensive: number;
  split_savings_vs_cheapest_single: number;
}

// ── Flat Optimization Result (POST /cart/optimize — stateless, guest-friendly) ─

export interface FlatPlatformItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  platform_product_url: string | null;
}

export interface FlatPlatformOut {
  platform_slug: string;
  platform_name: string;
  platform_color: string;
  items: FlatPlatformItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  platform_url: string;
  item_count: number;
}

export interface FlatOptimizationResult {
  original_total: number;
  optimized_total: number;
  savings: number;
  savings_percent: number;
  recommendation: "split" | "single";
  platforms: FlatPlatformOut[];
  message: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  pincode: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: User;  // included on login/register — saves a round-trip /me call
}

// ── Price Alerts ──────────────────────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  product: Product;
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}
