"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export function HeroAuthButton() {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();

  // Don't render anything until Zustand has rehydrated to avoid flash
  if (!hasHydrated) return <div className="w-24 h-9" />;

  if (isAuthenticated) {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-2 flex-shrink-0 bg-white/20 border border-white/30
                   text-white text-[12px] font-bold px-3 py-2 rounded-xl
                   hover:bg-white/30 active:scale-[0.97] transition-all"
      >
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-brand-700 text-[10px] font-black leading-none">
            {user?.full_name?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
        <span className="hidden sm:block truncate max-w-[90px]">
          Hi, {user?.full_name?.split(" ")[0] ?? "there"}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/auth/signup"
      className="flex-shrink-0 text-[12px] font-extrabold bg-white text-brand-700
                 px-4 py-2 rounded-xl hover:bg-yellow-50 hover:scale-105
                 active:scale-[0.97] transition-all shadow-md"
    >
      Sign up free
    </Link>
  );
}
