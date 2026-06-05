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
  const { hasHydrated, user, accessToken, setUser, logout } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();

  useEffect(() => {
    // Wait for the persisted auth store to rehydrate before doing anything.
    if (!hasHydrated) return;

    // Case 1: We have BOTH user object AND accessToken in localStorage.
    // This is the normal returning-user case. Validate session via api.me()
    // (which will use the stored accessToken from the Axios interceptor).
    if (user && accessToken) {
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

    // Case 2: user in localStorage but no accessToken (old store format before
    // the fix, or token was cleared). Try to restore via refresh-token cookie.
    // Only attempt this if we have a user object — avoids unnecessary 401s for
    // genuinely logged-out users.
    if (user && !accessToken) {
      api.me()
        .then(({ data }) => {
          setUser(data);
          fetchCart().catch(() => {});
        })
        .catch(() => {
          logout();
          resetCart();
        });
      return;
    }

    // Case 3: No user at all — genuinely logged out. Do nothing.
    // (Previously this called api.me() unconditionally which caused a 401 →
    // refresh attempt → logout() cascade for every unauthenticated page load.)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]); // ← intentionally omit user/accessToken/setUser/logout/fetchCart/resetCart

  // Listen for the pb-cart-refresh event dispatched by Flutter's refreshCart()
  // so the cart page updates without a full page reload.
  useEffect(() => {
    function handleCartRefresh() {
      fetchCart().catch(() => {});
    }
    window.addEventListener("pb-cart-refresh", handleCartRefresh);
    return () => window.removeEventListener("pb-cart-refresh", handleCartRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
