/**
 * Auth store — persists user + access token so the session survives WebView
 * restarts (hot restart, app backgrounding, etc.).
 *
 * Security note: storing the access token in localStorage is acceptable here
 * because the WebView is a controlled native shell (not a public browser tab),
 * and the token is also mirrored in Flutter's encrypted secure storage.
 * The refresh token remains httpOnly-cookie-only.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

/** Keys written to localStorage by this store or legacy code. */
const LS_KEYS = ["pb_auth", "pb_access_token", "pb_refresh_token", "pb_user"] as const;

/** Expire an auth cookie by name (works for non-httpOnly cookies only). */
function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  // Also attempt secure/cross-origin variant used in production
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure`;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  /** True while AuthBootstrap is calling api.me() to validate the session.
   *  Pages that need auth (e.g. /cart) must wait for this to be false before
   *  deciding to redirect to login — prevents the flash-redirect on page load. */
  isValidatingSession: boolean;
  markHydrated: () => void;
  setValidatingSession: (v: boolean) => void;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      isValidatingSession: false,

      markHydrated: () =>
        set((state) => ({
          hasHydrated: true,
          // Consider authenticated if we have a user object — even if accessToken
          // is temporarily null (it will be refreshed via cookie or Flutter injection).
          // Using user alone prevents the "no token → isAuthenticated=false → cart
          // redirects to login" race condition on page load.
          isAuthenticated: Boolean(state.user),
          // If we have a persisted user, immediately mark session as validating so
          // the login page redirect guard waits for AuthBootstrap's api.me() to
          // finish before deciding to redirect. Without this, the login page
          // useEffect fires with isValidatingSession=false before AuthBootstrap
          // has a chance to set it to true — causing an instant redirect to "/" when
          // the user navigates to /auth/login (even if they want to switch accounts).
          isValidatingSession: Boolean(state.user),
        })),

      setValidatingSession: (v) => set({ isValidatingSession: v }),

      setUser: (user) => set({ user, isAuthenticated: true }),

      setAccessToken: (token) => {
        set({ accessToken: token, isAuthenticated: true });
        // Notify Flutter shell (if running inside WebView) about the new token
        if (typeof window !== "undefined" && (window as any).FlutterBridge) {
          (window as any).FlutterBridge.postMessage(
            JSON.stringify({ type: "auth", token })
          );
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });

        // Clear all localStorage keys used by this app (pb_auth is the Zustand
        // persist key; the others are legacy / belt-and-suspenders).
        if (typeof window !== "undefined") {
          LS_KEYS.forEach((key) => {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
          });

          // Clear the refresh-token cookie (non-httpOnly variant, if ever set).
          // The httpOnly cookie is cleared server-side by POST /auth/logout.
          clearCookie("pb_refresh_token");

          // Fire-and-forget backend logout so the server revokes the refresh token
          // and clears the httpOnly cookie. We intentionally don't await this —
          // the user is already logged out locally regardless of network state.
          fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }).catch(() => {
            // Swallowed — logout must never fail from the user's perspective.
          });

          // Notify Flutter shell about logout
          if ((window as any).FlutterBridge) {
            (window as any).FlutterBridge.postMessage(JSON.stringify({ type: "logout" }));
          }
        }
      },
    }),
    {
      name: "pb_auth",
      // Persist BOTH user and accessToken so the session survives WebView
      // restarts. Without accessToken, the first API call after restart gets
      // 401, triggers a refresh, and if the httpOnly cookie isn't sent (e.g.
      // cold start race) the user gets silently logged out.
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);
