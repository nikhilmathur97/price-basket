/**
 * Cart store — manages local cart state with optimistic updates.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem, FlatOptimizationResult } from "@/types";
import { api } from "@/services/api";
import { MOCK_PRODUCTS } from "@/lib/mockData";

/** Notify the Flutter native shell about the current cart item count. */
function _notifyFlutterCartCount(count: number) {
  if (typeof window !== "undefined" && window.FlutterBridge) {
    window.FlutterBridge.postMessage(
      JSON.stringify({ type: "cart_count", count })
    );
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeMockCart(items: CartItem[]): Cart {
  return {
    id: "mock-cart",
    items,
    total_items: items.reduce((s, i) => s + i.quantity, 0),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface CartState {
  cart: Cart | null;
  isOpen: boolean;
  isLoading: boolean;
  totalItems: number;
  _hasHydrated: boolean;
  optimizationResult: FlatOptimizationResult | null;
  isOptimizing: boolean;

  openCart: () => void;
  closeCart: () => void;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, platformId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetCart: () => void;
  _setHasHydrated: () => void;
  setOptimizationResult: (result: FlatOptimizationResult | null) => void;
  optimizeCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isOpen: false,
      isLoading: false,
      totalItems: 0,
      _hasHydrated: false,
      optimizationResult: null,
      isOptimizing: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      fetchCart: async () => {
        // Prevent concurrent fetches
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const { data } = await api.getCart();
          set({ cart: data, totalItems: data.total_items, isLoading: false });
          _notifyFlutterCartCount(data.total_items);
        } catch {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, quantity = 1, platformId) => {
        // ── Mock / demo product: local-only cart, no API call ──────────────────
        if (!UUID_RE.test(productId)) {
          const mock = MOCK_PRODUCTS.find((p) => p.id === productId);
          if (!mock) return;
          const pp = platformId
            ? mock.platform_prices.find((p) => p.platform.id === platformId)
            : [...mock.platform_prices].sort((a, b) => a.price - b.price)[0];
          const current = get().cart;
          const existing = current?.items.find((i) => i.product.id === productId);
          const updatedItems: CartItem[] = existing
            ? (current?.items ?? []).map((i) =>
                i.product.id === productId
                  ? { ...i, quantity: Math.min(i.quantity + quantity, 100) }
                  : i
              )
            : [
                ...(current?.items ?? []),
                {
                  id: `mock_${productId}`,
                  product: mock,
                  selected_platform: pp?.platform ?? null,
                  quantity,
                  snapshot_price: pp?.price ?? null,
                  added_at: new Date().toISOString(),
                },
              ];
          const updated = makeMockCart(updatedItems);
          set({ cart: updated, totalItems: updated.total_items });
          _notifyFlutterCartCount(updated.total_items);
          return;
        }
        // ── Real product: call API ─────────────────────────────────────────────
        try {
          const { data } = await api.addToCart({
            product_id: productId,
            quantity,
            selected_platform_id: platformId,
          });
          set({ cart: data, totalItems: data.total_items });
          _notifyFlutterCartCount(data.total_items);
        } catch (err) {
          // Revert by re-fetching
          await get().fetchCart();
          throw err;
        }
      },

      updateItem: async (itemId, quantity) => {
        // Mock item: local update
        if (itemId.startsWith("mock_")) {
          const current = get().cart;
          if (!current) return;
          const updatedItems =
            quantity <= 0
              ? current.items.filter((i) => i.id !== itemId)
              : current.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
          const updated = makeMockCart(updatedItems);
          set({ cart: updated, totalItems: updated.total_items });
          _notifyFlutterCartCount(updated.total_items);
          return;
        }
        // Optimistic update so badge/count reflects the change immediately
        const prev = get().cart;
        if (prev) {
          const updatedItems =
            quantity <= 0
              ? prev.items.filter((i) => i.id !== itemId)
              : prev.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
          const newCount = updatedItems.reduce((s, i) => s + i.quantity, 0);
          set({ cart: { ...prev, items: updatedItems }, totalItems: newCount });
          _notifyFlutterCartCount(newCount);
        }
        try {
          const { data } = await api.updateCartItem(itemId, { quantity });
          set({ cart: data, totalItems: data.total_items });
          _notifyFlutterCartCount(data.total_items);
        } catch {
          // Revert optimistic update on failure
          if (prev) {
            set({ cart: prev, totalItems: prev.total_items });
            _notifyFlutterCartCount(prev.total_items);
          }
          await get().fetchCart();
        }
      },

      removeItem: async (itemId) => {
        // Mock item: local remove
        if (itemId.startsWith("mock_")) {
          const current = get().cart;
          if (!current) return;
          const updatedItems = current.items.filter((i) => i.id !== itemId);
          const updated = makeMockCart(updatedItems);
          set({ cart: updated, totalItems: updated.total_items });
          _notifyFlutterCartCount(updated.total_items);
          return;
        }
        // Optimistic remove for real items
        const prev = get().cart;
        if (prev) {
          const updated = {
            ...prev,
            items: prev.items.filter((i) => i.id !== itemId),
          };
          const newCount = updated.items.reduce((s, i) => s + i.quantity, 0);
          set({ cart: updated, totalItems: newCount });
          _notifyFlutterCartCount(newCount);
        }
        try {
          await api.removeCartItem(itemId);
        } catch (err) {
          set({ cart: prev, totalItems: prev?.total_items ?? 0 });
          _notifyFlutterCartCount(prev?.total_items ?? 0);
          throw err;
        }
      },

      clearCart: async () => {
        const prev = get().cart;
        set({ cart: null, totalItems: 0 });
        _notifyFlutterCartCount(0);
        try {
          await api.clearCart();
        } catch {
          // Revert on failure
          set({ cart: prev, totalItems: prev?.total_items ?? 0 });
          _notifyFlutterCartCount(prev?.total_items ?? 0);
        }
      },

      resetCart: () => {
        set({ cart: null, totalItems: 0, isOpen: false, optimizationResult: null });
      },

      _setHasHydrated: () => set({ _hasHydrated: true }),

      setOptimizationResult: (result) => set({ optimizationResult: result }),

      optimizeCart: async () => {
        const cart = get().cart;
        if (!cart?.items.length) return;
        set({ isOptimizing: true });
        try {
          const items = cart.items
            .filter((i) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.product.id))
            .map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
          if (!items.length) {
            set({ isOptimizing: false });
            return;
          }
          const { data } = await api.optimizeCart(items);
          set({ optimizationResult: data, isOptimizing: false });
        } catch {
          set({ isOptimizing: false });
          throw new Error("Optimization failed");
        }
      },
    }),
    {
      name: "pb_cart_meta",
      // Only persist the badge count — never the cart items themselves.
      // Persisting cart items causes stale products/prices to appear for new
      // users or after switching accounts, because localStorage outlives the session.
      partialize: (state) => ({ totalItems: state.totalItems }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated();
      },
    }
  )
);
