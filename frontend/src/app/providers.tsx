"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";

/** Ensures a stable guest session ID exists in localStorage.
 *  The Axios request interceptor in api.ts reads this and sends it as
 *  X-Session-ID so the backend can create guest carts without login. */
function GuestSession() {
  useEffect(() => {
    if (!localStorage.getItem("pb_session_id")) {
      const id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("pb_session_id", id);
    }
  }, []);
  return null;
}

function AuthBootstrap() {
  const { hasHydrated, user, setUser, logout } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();

  useEffect(() => {
    // Wait for the persisted auth store to rehydrate before doing anything.
    if (!hasHydrated) return;

    // Case 1: user object is already in localStorage (returning user / page reload).
    // Validate the session is still alive via api.me(), then always fetch the
    // server-side cart so cross-device changes are reflected immediately.
    if (user) {
      api.me()
        .then(({ data }) => {
          setUser(data);
          // Always sync cart from server — covers cross-device scenario where
          // items were added on another device/session.
          fetchCart().catch(() => {});
        })
        .catch(() => {
          // Session expired — clear everything
          logout();
          resetCart();
        });
      return;
    }

    // Case 2: no user in localStorage — try to restore session via refresh-token cookie.
    api.me()
      .then(({ data }) => {
        setUser(data);
        fetchCart().catch(() => {});
      })
      .catch(() => {
        logout();
        resetCart();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]); // ← intentionally omit user/setUser/logout/fetchCart/resetCart

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <GuestSession />
      <AuthBootstrap />
      {children}
    </QueryClientProvider>
  );
}
