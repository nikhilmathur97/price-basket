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
  const { hasHydrated, user, accessToken, setUser, logout, setValidatingSession } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();

  useEffect(() => {
    // Wait for the persisted auth store to rehydrate before doing anything.
    if (!hasHydrated) return;

    // Case 1: We have a user object (with or without accessToken).
    // Validate the session via api.me() — the Axios interceptor will send the
    // stored accessToken if present, or the httpOnly refresh cookie will be used.
    // Set isValidatingSession=true so protected pages (e.g. /cart) don't
    // redirect to login while we're still checking.
    if (user) {
      setValidatingSession(true);
      api.me()
        .then(({ data }) => {
          setUser(data);
          fetchCart().catch(() => {});
        })
        .catch(() => {
          // Session truly expired — clear everything and let the page redirect.
          logout();
          resetCart();
        })
        .finally(() => {
          setValidatingSession(false);
        });
      return;
    }

    // Case 2: No user at all — genuinely logged out. Do nothing.
    // (Previously this called api.me() unconditionally which caused a 401 →
    // refresh attempt → logout() cascade for every unauthenticated page load.)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]); // ← intentionally omit deps to run only once after hydration

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
