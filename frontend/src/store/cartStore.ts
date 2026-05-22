/**
 * Cart store — manages local cart state with optimistic updates.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem } from "@/types";
import { api } from "@/services/api";
import { MOCK_PRODUCTS } from "@/lib/mockData";

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

  openCart: () => void;
  closeCart: () => void;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, platformId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetCart: () => void;
  _setHasHydrated: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isOpen: false,
      isLoading: false,
      totalItems: 0,
      _hasHydrated: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.getCart();
          // Preserve any local mock items that aren't in the DB
          const mockItems = (get().cart?.items ?? []).filter((i) =>
            i.id.startsWith("mock_")
          );
          const merged: Cart =
            mockItems.length > 0
              ? {
                  ...data,
                  items: [...mockItems, ...data.items],
                  total_items:
                    data.total_items +
                    mockItems.reduce((s, i) => s + i.quantity, 0),
                }
              : data;
          set({ cart: merged, totalItems: merged.total_items, isLoading: false });
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
          return;
        }
        try {
          const { data } = await api.updateCartItem(itemId, { quantity });
          set({ cart: data, totalItems: data.total_items });
        } catch {
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
          return;
        }
        // Optimistic remove for real items
        const prev = get().cart;
        if (prev) {
          const updated = {
            ...prev,
            items: prev.items.filter((i) => i.id !== itemId),
          };
          set({ cart: updated, totalItems: updated.items.reduce((s, i) => s + i.quantity, 0) });
        }
        try {
          await api.removeCartItem(itemId);
        } catch {
          set({ cart: prev, totalItems: prev?.total_items ?? 0 });
        }
      },

      clearCart: async () => {
        await api.clearCart();
        set({ cart: null, totalItems: 0 });
      },

      resetCart: () => {
        set({ cart: null, totalItems: 0, isOpen: false });
      },

      _setHasHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "pb_cart_meta",
      partialize: (state) => ({ totalItems: state.totalItems, cart: state.cart }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated();
      },
    }
  )
);
