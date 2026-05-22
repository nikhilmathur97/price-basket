/**
 * Auth store — persists access token in memory (not localStorage for XSS safety).
 * Refresh token is handled via httpOnly cookie.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  markHydrated: () => void;
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

      markHydrated: () =>
        set((state) => ({
          hasHydrated: true,
          isAuthenticated: Boolean(state.user),
        })),

      setUser: (user) => set({ user, isAuthenticated: true }),

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: "pb_auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);
