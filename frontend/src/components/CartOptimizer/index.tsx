"use client";

import { Truck, TrendingDown, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import type { OptimizationResult, PlatformBundle } from "@/types";
import { cn } from "@/lib/utils";

interface CartOptimizerProps {
  result: OptimizationResult;
  activeStrategy: "cheapest_single" | "fastest_single" | "cheapest_split" | "best_value_split";
  onSelectStrategy: (
    strategy: "cheapest_single" | "fastest_single" | "cheapest_split" | "best_value_split"
  ) => void;
}

const STRATEGIES = [
  {
    key: "cheapest_single" as const,
    label: "Cheapest Single",
    icon: TrendingDown,
    description: "All from one cheapest platform",
    colorClass: "border-green-200 bg-green-50",
    badgeClass: "bg-green-600 text-white",
  },
  {
    key: "fastest_single" as const,
    label: "Fastest Single",
    icon: Truck,
    description: "All from fastest platform",
    colorClass: "border-yellow-200 bg-yellow-50",
    badgeClass: "bg-yellow-500 text-white",
  },
  {
    key: "cheapest_split" as const,
    label: "Cheapest Split",
    icon: ShoppingBag,
    description: "Each item from cheapest source",
    colorClass: "border-blue-200 bg-blue-50",
    badgeClass: "bg-blue-600 text-white",
  },
  {
    key: "best_value_split" as const,
    label: "Best Value Split",
    icon: Sparkles,
    description: "Price + speed balanced",
    colorClass: "border-purple-200 bg-purple-50",
    badgeClass: "bg-purple-600 text-white",
  },
] as const;

function BundleTotal({ bundles }: { bundles: PlatformBundle | PlatformBundle[] }) {
  const list = Array.isArray(bundles) ? bundles : [bundles];
  const total = list.reduce((s, b) => s + b.total, 0);
  const deliveryTime = Math.max(...list.map((b) => b.estimated_delivery_minutes));
  return (
    <div className="flex items-end gap-2">
      <span className="text-2xl font-bold text-surface-900">₹{total.toFixed(0)}</span>
      {deliveryTime > 0 && (
        <span className="text-sm text-surface-400 mb-0.5">· ~{deliveryTime} min</span>
      )}
    </div>
  );
}

export function CartOptimizer({ result, activeStrategy, onSelectStrategy }: CartOptimizerProps) {
  const getBundles = (key: typeof activeStrategy): PlatformBundle | PlatformBundle[] => {
    switch (key) {
      case "cheapest_single": return result.cheapest_single;
      case "fastest_single":  return result.fastest_single;
      case "cheapest_split":  return result.cheapest_split;
      case "best_value_split": return result.best_value_split;
    }
  };

  const getTotal = (key: typeof activeStrategy): number => {
    const b = getBundles(key);
    const list = Array.isArray(b) ? b : [b];
    return list.reduce((s, x) => s + x.total, 0);
  };

  return (
    <div className="space-y-4">
      {/* Savings headline */}
      {result.savings_vs_most_expensive > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800 text-sm">
              Save up to ₹{result.savings_vs_most_expensive.toFixed(0)}
            </p>
            <p className="text-xs text-green-600">vs. buying from the most expensive platform</p>
          </div>
        </div>
      )}

      {/* Strategy cards */}
      <div className="grid grid-cols-2 gap-3">
        {STRATEGIES.map((strategy) => {
          const isActive = activeStrategy === strategy.key;
          const Icon = strategy.icon;
          const total = getTotal(strategy.key);

          return (
            <button
              key={strategy.key}
              onClick={() => onSelectStrategy(strategy.key)}
              className={cn(
                "p-4 rounded-2xl border-2 text-left transition-all duration-150",
                isActive
                  ? `${strategy.colorClass} border-opacity-100 shadow-sm`
                  : "border-surface-100 bg-white hover:border-surface-200"
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2",
                isActive ? strategy.badgeClass : "bg-surface-100"
              )}>
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-surface-500")} />
              </div>
              <p className={cn("text-xs font-semibold mb-0.5", isActive ? "text-surface-800" : "text-surface-500")}>
                {strategy.label}
              </p>
              <p className={cn("text-base font-bold", isActive ? "text-surface-900" : "text-surface-600")}>
                ₹{total.toFixed(0)}
              </p>
              <p className="text-xs text-surface-400 mt-0.5">{strategy.description}</p>
            </button>
          );
        })}
      </div>

      {/* Active strategy breakdown */}
      <ActiveStrategyBreakdown bundles={getBundles(activeStrategy)} />
    </div>
  );
}

function ActiveStrategyBreakdown({ bundles }: { bundles: PlatformBundle | PlatformBundle[] }) {
  const list = Array.isArray(bundles) ? bundles : [bundles];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-surface-700">Order breakdown</h4>
      {list.map((bundle, i) => (
        <div key={i} className="card p-4">
          {/* Platform header */}
          <div
            className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-100"
          >
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: bundle.platform_color }}
            />
            <span className="font-semibold text-sm text-surface-900">{bundle.platform_name}</span>
            <span className="ml-auto text-xs text-surface-400">
              ~{bundle.estimated_delivery_minutes} min
            </span>
          </div>

          {/* Items */}
          <div className="space-y-1.5 mb-3">
            {bundle.items.map((item, j) => (
              <div key={j} className="flex justify-between text-sm">
                <span className="text-surface-700 truncate flex-1 mr-2">
                  {item.product_name} × {item.quantity}
                </span>
                <span className="font-medium text-surface-900 flex-shrink-0">
                  ₹{item.line_total.toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-surface-100 pt-2 space-y-1">
            <div className="flex justify-between text-xs text-surface-500">
              <span>Subtotal</span>
              <span>₹{bundle.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-xs text-surface-500">
              <span>Delivery</span>
              <span>{bundle.delivery_fee === 0 ? "Free" : `₹${bundle.delivery_fee.toFixed(0)}`}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-surface-900 pt-1">
              <span>Total</span>
              <span>₹{bundle.total.toFixed(0)}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <a
            href={bundle.items[0]?.platform_product_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            Order on {bundle.platform_name}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  );
}
