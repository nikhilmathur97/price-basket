"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

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

  useEffect(() => {
    // Only run once: when the store has hydrated and there is no locally-stored
    // user. Do NOT add `user` as a dependency — that would re-run after logout
    // and silently re-log the user in via the still-live refresh-token cookie.
    if (!hasHydrated || user) return;

    api.me()
      .then(({ data }) => setUser(data))
      .catch(() => logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]); // ← intentionally omit user/setUser/logout

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
