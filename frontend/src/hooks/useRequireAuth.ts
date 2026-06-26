/**
 * useRequireAuth — redirect unauthenticated users to /auth/login?next=<path>.
 *
 * Usage (inside any "use client" page or component):
 *
 *   const { isReady } = useRequireAuth();
 *   if (!isReady) return <LoadingSpinner />;
 *
 * `isReady` is true only when:
 *   1. Zustand has rehydrated from localStorage (hasHydrated)
 *   2. AuthBootstrap has finished validating the session (isValidatingSession === false)
 *   3. The user IS authenticated
 *
 * While waiting, the hook returns { isReady: false } so the caller can render
 * a loading skeleton instead of flashing unauthenticated content.
 *
 * If the user is not authenticated after hydration + validation, the hook
 * redirects to /auth/login?next=<current_pathname> and keeps returning
 * { isReady: false } so the page never renders.
 */
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

interface UseRequireAuthResult {
  /** True once auth state is confirmed and the user is authenticated. */
  isReady: boolean;
}

export function useRequireAuth(): UseRequireAuthResult {
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, hasHydrated, isValidatingSession } =
    useAuthStore();

  const settled = hasHydrated && !isValidatingSession;

  useEffect(() => {
    if (settled && !isAuthenticated) {
      // Encode the current path so the login page can redirect back after login.
      const next = encodeURIComponent(pathname ?? "/");
      router.replace(`/auth/login?next=${next}`);
    }
  }, [settled, isAuthenticated, pathname, router]);

  return { isReady: settled && isAuthenticated };
}
