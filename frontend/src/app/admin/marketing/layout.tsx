"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, Library, CalendarDays, BarChart2, Settings2,
} from "lucide-react";

const SUBNAV = [
  { href: "/admin/marketing",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/marketing/agents",     label: "Agents",        icon: Bot },
  { href: "/admin/marketing/library",    label: "Content Library", icon: Library },
  { href: "/admin/marketing/scheduler",  label: "Scheduler",     icon: CalendarDays },
  { href: "/admin/marketing/analytics",  label: "Analytics",     icon: BarChart2 },
  { href: "/admin/marketing/settings",   label: "Settings",      icon: Settings2 },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Marketing header */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <div>
            <h2 className="font-bold text-surface-900 text-sm">Free Digital Marketing Agent</h2>
            <p className="text-xs text-surface-400">10 AI agents · 100% free channels · Auto-save to library</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1">
          {SUBNAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin/marketing"
              ? pathname === "/admin/marketing"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-brand-600 text-white"
                    : "text-surface-600 hover:bg-surface-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
