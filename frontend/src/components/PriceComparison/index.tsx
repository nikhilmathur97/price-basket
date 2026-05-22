"use client";

import { CheckCircle2, Zap, Star, ExternalLink, Clock } from "lucide-react";
import type { PlatformPrice, Platform } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface PriceComparisonProps {
  prices: PlatformPrice[];
  cheapestPlatform: Platform | null;
  fastestPlatform: Platform | null;
  bestValuePlatform: Platform | null;
  onSelectPlatform?: (platformId: string) => void;
  selectedPlatformId?: string;
}

export function PriceComparison({
  prices,
  cheapestPlatform,
  fastestPlatform,
  bestValuePlatform,
  onSelectPlatform,
  selectedPlatformId,
}: PriceComparisonProps) {
  const sorted = [...prices].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-surface-700">Compare across platforms</h3>
      {sorted.map((pp) => {
        const isCheapest = pp.platform.id === cheapestPlatform?.id;
        const isFastest = pp.platform.id === fastestPlatform?.id;
        const isBestValue = pp.platform.id === bestValuePlatform?.id;
        const isSelected = selectedPlatformId === pp.platform.id;

        return (
          <button
            key={pp.platform.id}
            onClick={() => onSelectPlatform?.(pp.platform.id)}
            className={cn(
              "w-full card p-4 flex items-center gap-4 text-left transition-all duration-150",
              "hover:shadow-hover hover:border-brand-200",
              isSelected && "border-brand-500 shadow-sm bg-brand-50/30",
              !pp.is_available && "opacity-50 pointer-events-none"
            )}
          >
            {/* Platform logo */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                backgroundColor: (pp.platform.color_hex ?? "#e5e7eb") + "22",
                border: `1.5px solid ${pp.platform.color_hex ?? "#e5e7eb"}55`,
              }}
            >
              {pp.platform.logo_url ? (
                <Image
                  src={pp.platform.logo_url}
                  alt={pp.platform.name}
                  width={28}
                  height={28}
                  className="object-contain w-7 h-7"
                  unoptimized
                />
              ) : (
                <span className="text-xs font-bold" style={{ color: pp.platform.color_hex ?? "#6b7280" }}>
                  {pp.platform.name[0]}
                </span>
              )}
            </div>

            {/* Name + availability */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-surface-900 text-sm">
                  {pp.platform.name}
                </span>
                {/* Highlight badges */}
                {isCheapest && (
                  <span className="badge-cheapest">
                    <CheckCircle2 className="w-3 h-3" /> Cheapest
                  </span>
                )}
                {isFastest && (
                  <span className="badge-fastest">
                    <Zap className="w-3 h-3 fill-yellow-600" /> Fastest
                  </span>
                )}
                {isBestValue && !isCheapest && (
                  <span className="badge-best-value">
                    <Star className="w-3 h-3" /> Best Value
                  </span>
                )}
              </div>

              {/* Delivery time */}
              <div className="flex items-center gap-1 text-xs text-surface-400 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {pp.delivery_time_minutes != null
                    ? `${pp.delivery_time_minutes} min delivery`
                    : `~${pp.platform.avg_delivery_minutes} min`}
                </span>
                {!pp.is_available && (
                  <span className="text-red-500 font-medium ml-2">Out of stock</span>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-surface-900">₹{pp.price}</div>
              {pp.original_price && pp.original_price > pp.price && (
                <div className="text-xs text-surface-400 line-through">
                  ₹{pp.original_price}
                </div>
              )}
              {pp.discount_percent > 0 && (
                <div className="discount-badge">{Math.round(pp.discount_percent)}% OFF</div>
              )}
            </div>

            {/* External link */}
            {(pp.buy_url ?? pp.platform_product_url) && (
              <a
                href={pp.buy_url ?? pp.platform_product_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-surface-300 hover:text-brand-600 transition-colors"
                aria-label={`View on ${pp.platform.name}`}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </button>
        );
      })}

      {sorted.length === 0 && (
        <p className="text-sm text-surface-400 text-center py-6">
          No prices available right now.
        </p>
      )}
    </div>
  );
}
