"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ShoppingCart, Clock, Package, ChevronDown, ChevronUp, User } from "lucide-react";

type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

type CartItem = {
  item_id: string;
  product_name: string;
  brand: string | null;
  unit: string | null;
  image_url: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  platform: string | null;
  added_at: string;
};

type UserCartDetail = {
  user_id: string;
  email: string;
  full_name: string | null;
  last_login_at: string | null;
  cart: { id: string; created_at: string; updated_at: string } | null;
  items: CartItem[];
  total: number;
};

function fmt(dt: string | null) {
  if (!dt) return "Never";
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function UserCartRow({ user }: { user: AdminUser }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isFetching } = useQuery<UserCartDetail>({
    queryKey: ["admin-user-cart", user.id],
    queryFn: async () => (await api.getAdminUserCart(user.id)).data,
    enabled: expanded,
    staleTime: 30_000,
  });

  const hasCart = data && data.items.length > 0;

  return (
    <div className="border-b border-surface-100 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-surface-900 text-sm truncate">
            {user.full_name ?? "Unknown"}
          </p>
          <p className="text-xs text-surface-500 truncate">{user.email}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end mr-4">
          <span className="text-xs text-surface-500">Last login</span>
          <span className="text-xs font-medium text-surface-700">{fmt(user.last_login_at)}</span>
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-surface-50/50">
          {isFetching && !data && (
            <p className="text-sm text-surface-500 py-3">Loading cart details...</p>
          )}

          {data && (
            <div className="space-y-3">
              {/* Meta row */}
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-surface-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last login: <strong>{fmt(data.last_login_at)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-surface-600">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>
                    Cart: {hasCart
                      ? <strong className="text-brand-600">{data.items.length} item{data.items.length > 1 ? "s" : ""} · ₹{data.total.toFixed(2)}</strong>
                      : <strong className="text-surface-400">Empty</strong>}
                  </span>
                </div>
                {data.cart && (
                  <div className="flex items-center gap-1.5 text-xs text-surface-600">
                    <Package className="w-3.5 h-3.5" />
                    <span>Cart updated: <strong>{fmt(data.cart.updated_at)}</strong></span>
                  </div>
                )}
              </div>

              {/* Cart items table */}
              {hasCart ? (
                <div className="rounded-xl border border-surface-200 overflow-hidden bg-white">
                  <table className="min-w-full text-xs">
                    <thead className="bg-surface-100 text-surface-600">
                      <tr>
                        <th className="text-left px-3 py-2">Product</th>
                        <th className="text-center px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Price</th>
                        <th className="text-right px-3 py-2">Subtotal</th>
                        <th className="text-left px-3 py-2">Platform</th>
                        <th className="text-left px-3 py-2">Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={item.item_id} className="border-t border-surface-100">
                          <td className="px-3 py-2">
                            <p className="font-medium text-surface-900">{item.product_name}</p>
                            {item.brand && <p className="text-surface-400">{item.brand} · {item.unit}</p>}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-surface-800">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-surface-700">
                            ₹{item.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-brand-700">
                            ₹{item.subtotal.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {item.platform ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                                {item.platform}
                              </span>
                            ) : (
                              <span className="text-surface-400 italic">Not selected</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-surface-500">
                            {fmt(item.added_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-50 border-t border-surface-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-semibold text-surface-700 text-xs">
                          Cart Total
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-brand-700">
                          ₹{data.total.toFixed(2)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>

                  {/* Order status note */}
                  <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700">
                      <strong>Order status:</strong> PriceBasket redirects users to platform checkout — orders are placed directly on Blinkit/Zepto/BigBasket etc. Check the <strong>Analytics</strong> tab for <em>platform_redirect</em> events to see if this user completed checkout.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-surface-200 bg-white px-4 py-6 text-center">
                  <ShoppingCart className="w-6 h-6 text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-500">No active cart items</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserActivityPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ total: number; items: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.getAdminUsers({ limit: 500, offset: 0 })).data,
  });

  const filtered = (data?.items ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-surface-900">User Activity</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Last login time · active cart items · cart value per user
          </p>
        </div>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-surface-200 rounded-xl px-3 py-2 text-sm w-full sm:w-64
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
          <span className="text-sm font-medium text-surface-700">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-surface-400">Click a row to expand cart</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-surface-400 text-sm">No users found</div>
        ) : (
          <div>
            {filtered.map((u) => (
              <UserCartRow key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
