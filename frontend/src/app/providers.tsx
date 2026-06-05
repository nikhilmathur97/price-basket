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

    // If we have a user + accessToken in localStorage, trust them immediately —
    // no api.me() call needed. Just fetch the cart in the background.
    // This makes every page load instant for logged-in users.
    if (user && accessToken) {
      fetchCart().catch(() => {});
      return;
    }

    // If we have a user but no accessToken (old store format / token cleared),
    // try to restore via refresh-token cookie — but don't block the UI.
    if (user && !accessToken) {
      setValidatingSession(true);
      api.me()
        .then(({ data }) => {
          setUser(data);
          fetchCart().catch(() => {});
        })
        .catch(() => {
          logout();
          resetCart();
        })
        .finally(() => {
          setValidatingSession(false);
        });
      return;
    }

    // No user at all — genuinely logged out. Do nothing.

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
