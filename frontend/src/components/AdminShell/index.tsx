"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck, Users, Receipt, MessageSquare, Store, BarChart3, Home, Database, ShoppingBag, Activity, LayoutGrid, TrendingUp, Search, Megaphone } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const NAV = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/growth", label: "Growth Hub", icon: TrendingUp },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/seo", label: "SEO Health", icon: Search },
  { href: "/admin/catalog", label: "Catalog", icon: LayoutGrid },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/user-activity", label: "User Activity", icon: Activity },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/queries", label: "Queries", icon: MessageSquare },
  { href: "/admin/platforms", label: "Platforms", icon: Store },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/database", label: "Database", icon: Database },
  { href: "/admin/amazon", label: "Amazon", icon: ShoppingBag },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasHydrated, user } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (!user.is_admin) {
      router.replace("/");
    }
  }, [hasHydrated, router, user]);

  if (!hasHydrated || !user?.is_admin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-surface-500">Checking admin access...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Admin Panel</h1>
          <p className="text-sm text-surface-500">Quick commerce operations and analytics</p>
        </div>
        <Link href="/" className="btn-ghost text-sm inline-flex items-center gap-2">
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="card p-3">
            <nav className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-600 text-white"
                        : "text-surface-700 hover:bg-surface-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-4">{children}</section>
      </div>
    </div>
  );
}
