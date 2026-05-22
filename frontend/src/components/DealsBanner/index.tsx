"use client";

import Link from "next/link";
import { Tag, Zap, Clock } from "lucide-react";

const DEALS = [
  {
    title: "Up to 40% off",
    subtitle: "on Fresh Vegetables",
    href: "/search?category=fruits-vegetables&sort=discount_desc",
    bg: "from-green-500 to-green-700",
    icon: Tag,
    badge: "FRESH DEALS",
  },
  {
    title: "10-min delivery",
    subtitle: "on Dairy & Eggs",
    href: "/search?category=dairy-breakfast&sort=fastest",
    bg: "from-yellow-400 to-orange-500",
    icon: Zap,
    badge: "QUICK",
  },
  {
    title: "Best price on",
    subtitle: "Snacks & Beverages",
    href: "/search?category=snacks-drinks&sort=price_asc",
    bg: "from-purple-500 to-purple-700",
    icon: Clock,
    badge: "SAVE MORE",
  },
];

export function DealsBanner() {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-surface-900 mb-4">Today's Best Deals</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DEALS.map((deal) => {
          const Icon = deal.icon;
          return (
            <Link
              key={deal.title}
              href={deal.href}
              className={`bg-gradient-to-br ${deal.bg} rounded-2xl p-5 flex items-center gap-4
                          hover:scale-[1.02] transition-transform duration-150 cursor-pointer`}
            >
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white/70 text-xs font-bold tracking-wider">{deal.badge}</span>
                <p className="text-white font-bold text-base leading-tight">{deal.title}</p>
                <p className="text-white/80 text-sm">{deal.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
