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
        // Notify Flutter shell about logout
        if (typeof window !== "undefined" && (window as any).FlutterBridge) {
          (window as any).FlutterBridge.postMessage(JSON.stringify({ type: "logout" }));
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
