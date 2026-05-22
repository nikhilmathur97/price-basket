"use client";

import Link from "next/link";
import { TrendingDown, Zap, Star } from "lucide-react";

const RECOMMENDATIONS = [
  {
    icon: TrendingDown,
    label: "Cheapest Today",
    description: "Products at their lowest price across all platforms",
    href: "/search?sort=price_asc",
    color: "bg-green-50 text-green-700 border-green-200",
    iconColor: "text-green-600",
  },
  {
    icon: Zap,
    label: "Fastest Delivery",
    description: "Get it in under 10 minutes",
    href: "/search?sort=fastest",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    iconColor: "text-yellow-600",
  },
  {
    icon: Star,
    label: "Best Value",
    description: "Balanced price + delivery combo",
    href: "/search?sort=relevance",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
  },
];

export function SmartRecommendations() {
  return (
    <div>
      <h2 className="text-xl font-bold text-surface-900 mb-4">Smart Picks for You</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {RECOMMENDATIONS.map((rec) => {
          const Icon = rec.icon;
          return (
            <Link
              key={rec.label}
              href={rec.href}
              className={`card p-5 border flex items-start gap-4 hover:shadow-hover transition-shadow duration-150 ${rec.color}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-6 h-6 ${rec.iconColor}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{rec.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{rec.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
