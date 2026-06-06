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
  const { hasHydrated, user, setUser, logout, setValidatingSession } = useAuthStore();
  const { fetchCart, resetCart } = useCartStore();

  useEffect(() => {
    // Wait for the persisted auth store to rehydrate before doing anything.
    if (!hasHydrated) return;

    // No persisted user — genuinely logged out. Nothing to validate.
    if (!user) return;

    // We have a persisted user. The UI renders instantly trusting it (so login
    // stays fast), but we ALWAYS validate the session in the background via
    // api.me(). This is essential: a stale/invalid session (e.g. token expired,
    // backend redeploy, or the account no longer exists) must self-heal into a
    // clean logged-out state. Without this, an invalid persisted session traps
    // the user in a phantom "logged in" state where the Login button disappears
    // and /auth/login redirects away — i.e. "login button not working".
    //
    // On 401, the api.ts interceptor first tries /auth/refresh via the httpOnly
    // cookie; only if that also fails do we land in .catch() and log out.
    setValidatingSession(true);
    api.me()
      .then(({ data }) => {
        // Guard: if the user logged out while this request was in-flight, don't
        // re-authenticate. Without this, a valid api.me() response would call
        // setUser() after logout(), setting isAuthenticated=true and trapping the
        // user in a phantom logged-in state where /auth/login redirects them away.
        if (!useAuthStore.getState().user) return;
        setUser(data);
        fetchCart().catch(() => {});
      })
      .catch((err: any) => {
        const status: number | undefined = err?.response?.status;
        // Do NOT log out if the backend is temporarily unavailable (503/502/network
        // error during Render cold start). Only log out on explicit auth failures
        // (401 after refresh also failed, or 403 account disabled).
        // Without this guard, a slow cold start would log out a valid user every
        // time they open the app while the backend is warming up.
        if (!status || status === 503 || status === 502) {
          // Backend unreachable — keep the persisted session; user stays logged in.
          return;
        }
        logout();
        resetCart();
      })
      .finally(() => {
        setValidatingSession(false);
      });

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
