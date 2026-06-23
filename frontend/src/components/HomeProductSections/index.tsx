"use client";

/**
 * HomeProductSections
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders home page product rows.
 *
 * Loading strategy:
 *   1. Instantly show skeleton placeholders (zero-flash UX).
 *   2. React Query fetches real API data in background (staleTime = 5 min).
 *   3. When API resolves, swap seamlessly — no skeleton flash.
 *   4. Category sections only render when products exist for that category.
 *   5. Shows up to 100 products across all sections for maximum coverage.
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORY_SECTIONS } from "@/lib/mockData";
import type { ProductWithPrices } from "@/types";
import Link from "next/link";
import {
  Flame,
  Zap,
  Star,
  TrendingUp,
  ArrowRight,
  PackageSearch,
  Tag,
  Clock,
  Sparkles,
} from "lucide-react";

// ── Colour accents ─────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  "fruits-vegetables": { bg: "#FFF3E0", text: "#E65100" },
  "dairy-breakfast":   { bg: "#E3F2FD", text: "#1565C0" },
  "snacks-drinks":     { bg: "#F3E5F5", text: "#6A1B9A" },
  "bakery":            { bg: "#FBE9E7", text: "#BF360C" },
  "household":         { bg: "#E0F2F1", text: "#00695C" },
  "personal-care":     { bg: "#FCE4EC", text: "#880E4F" },
  "chicken-meat":      { bg: "#FFF8E1", text: "#F57F17" },
  "frozen-foods":      { bg: "#E8F5E9", text: "#2E7D32" },
  "baby-care":         { bg: "#F8BBD9", text: "#880E4F" },
  "staples":           { bg: "#FFFDE7", text: "#F57F17" },
  "oils-spices":       { bg: "#FFF3E0", text: "#BF360C" },
  "electronics":       { bg: "#E8EAF6", text: "#283593" },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
  live,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  live?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-[15px] font-extrabold text-surface-900 flex items-center gap-1.5">
          {icon}
          {title}
          {live && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-600
                             bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              LIVE
            </span>
          )}
          {badge && (
            <span className="text-[9px] font-bold text-orange-600
                             bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full ml-1">
              {badge}
            </span>
          )}
        </h2>
        {/* surface-500 (#737373) on white = 4.48:1 — passes WCAG AA for UI text */}
        {subtitle && <p className="text-[11px] text-surface-500 mt-0.5">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-[12px] font-bold text-brand-600
                     bg-brand-50 hover:bg-brand-600 hover:text-white
                     px-2.5 py-1 rounded-lg transition-all duration-200 active:scale-[0.95]"
        >
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function ProductRow({ products, loading }: { products: ProductWithPrices[]; loading?: boolean }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
    >
      {products.map((p) => (
        <div
          key={p.id}
          className={`flex-shrink-0 snap-start transition-opacity duration-200 ${
            loading ? "opacity-60" : "opacity-100"
          }`}
          style={{ width: "clamp(120px, 40vw, 150px)", display: "flex", flexDirection: "column" }}
        >
          <ProductCard product={p} className="flex-1" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex-shrink-0 rounded-2xl overflow-hidden bg-white border border-surface-100 shadow-sm"
      style={{ width: "clamp(120px, 40vw, 150px)" }}
    >
      <div className="aspect-square bg-surface-100 animate-pulse" />
      <div className="p-2 space-y-2">
        <div className="h-2.5 bg-surface-100 rounded animate-pulse w-3/4" />
        <div className="h-2.5 bg-surface-100 rounded animate-pulse w-full" />
        <div className="h-2.5 bg-surface-100 rounded animate-pulse w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-4 bg-surface-100 rounded animate-pulse w-12" />
          <div className="h-7 bg-surface-100 rounded-xl animate-pulse w-14" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <PackageSearch className="w-14 h-14 text-surface-300" />
      <div>
        <p className="text-base font-semibold text-surface-700">Products loading soon</p>
        <p className="text-sm text-surface-400 mt-1">
          Our team is scraping live prices from all platforms.<br />
          Check back in a few minutes!
        </p>
      </div>
      <Link
        href="/search"
        className="text-sm font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-xl
                   hover:bg-brand-600 hover:text-white transition-colors"
      >
        Search products →
      </Link>
    </div>
  );
}

// ── Savings badge strip ────────────────────────────────────────────────────
function SavingsBadge({ amount, platform }: { amount: number; platform?: string }) {
  if (amount <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold
                     text-green-700 bg-green-50 border border-green-100
                     px-1.5 py-0.5 rounded-full">
      Save ₹{Math.round(amount)}
      {platform && ` on ${platform}`}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function HomeProductSections() {
  const [slowLoad, setSlowLoad] = useState(false);

  const { data: apiProducts, isLoading, isFetching } = useQuery<ProductWithPrices[]>({
    queryKey: ["featured-home"],
    queryFn: async ({ signal }) => {
      // Fetch up to 100 products for richer home page coverage
      const { data } = await api.getFeatured(100, signal);
      const result = data ?? [];
      if (result.length === 0) throw new Error("empty");
      return result;
    },
    staleTime: 300_000,       // 5 min
    gcTime: 600_000,          // 10 min
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 2_000,
  });

  // After 12 s of loading, show a friendly slow-connection hint
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setSlowLoad(true), 12_000);
    return () => clearTimeout(t);
  }, [isLoading]);

  // ── All useMemo hooks MUST be declared before any conditional return ──────

  const products: ProductWithPrices[] = useMemo(
    () => apiProducts ?? [],
    [apiProducts]
  );
  const isFromAPI = products.length > 0;

  // ── Trending Now: first 12 products ──────────────────────────────────────
  const trendingNow = useMemo(() => products.slice(0, 12), [products]);

  // ── Best Deals: products with highest savings amount ─────────────────────
  const bestDeals = useMemo(
    () =>
      [...products]
        .filter((p) => (p.intelligence?.savings_amount ?? 0) > 5)
        .sort((a, b) => (b.intelligence?.savings_amount ?? 0) - (a.intelligence?.savings_amount ?? 0))
        .slice(0, 12),
    [products]
  );

  // ── Fastest Delivery: sorted by best ETA ─────────────────────────────────
  const fastestDelivery = useMemo(
    () =>
      [...products]
        .filter((p) => (p.coverage_summary?.best_eta_minutes ?? 999) <= 15)
        .sort(
          (a, b) =>
            (a.coverage_summary?.best_eta_minutes ?? 999) -
            (b.coverage_summary?.best_eta_minutes ?? 999)
        )
        .slice(0, 12),
    [products]
  );

  // ── Highly Recommended: highest price spread (most worth comparing) ───────
  const highlyRecommended = useMemo(
    () =>
      [...products]
        .filter((p) => (p.intelligence?.price_spread_percent ?? 0) > 5)
        .sort(
          (a, b) =>
            (b.intelligence?.price_spread_percent ?? 0) -
            (a.intelligence?.price_spread_percent ?? 0)
        )
        .slice(0, 12),
    [products]
  );

  // ── New Arrivals: most recently added products ────────────────────────────
  const newArrivals = useMemo(
    () => products.slice(Math.max(0, products.length - 12)),
    [products]
  );

  // ── Multi-platform: available on 3+ platforms ─────────────────────────────
  const multiPlatform = useMemo(
    () =>
      [...products]
        .filter((p) => (p.coverage_summary?.available_platform_count ?? 0) >= 3)
        .sort(
          (a, b) =>
            (b.coverage_summary?.available_platform_count ?? 0) -
            (a.coverage_summary?.available_platform_count ?? 0)
        )
        .slice(0, 12),
    [products]
  );

  // ── Under ₹100: budget products ───────────────────────────────────────────
  const under100 = useMemo(
    () =>
      [...products]
        .filter((p) => {
          const minPrice = Math.min(...p.platform_prices.map((pp) => pp.price));
          return minPrice > 0 && minPrice <= 100;
        })
        .sort((a, b) => {
          const aMin = Math.min(...a.platform_prices.map((pp) => pp.price));
          const bMin = Math.min(...b.platform_prices.map((pp) => pp.price));
          return aMin - bMin;
        })
        .slice(0, 12),
    [products]
  );

  // ── Conditional renders (after all hooks) ────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        {slowLoad && (
          <div className="flex items-center justify-center gap-2 py-2 bg-orange-50 rounded-xl border border-orange-100">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-[12px] font-medium text-orange-600 ml-1">
              Loading products, please wait a moment…
            </span>
          </div>
        )}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="h-5 w-40 bg-surface-200 rounded animate-pulse mb-3" />
            <SkeletonRow />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">


      {/* ── Trending Now ── */}
      {trendingNow.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<TrendingUp className="w-4 h-4 text-brand-600" />}
            title="Trending Now"
            subtitle={`${trendingNow.length} most searched products`}
            href="/search"
            live={isFromAPI}
          />
          <ProductRow products={trendingNow} loading={isFetching} />
        </div>
      )}

      {/* ── Best Deals Today ── */}
      {bestDeals.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            title="Best Deals Today"
            subtitle="Biggest savings across all platforms"
            href="/search?sort=discount"
            live={isFromAPI}
            badge={`Up to ₹${Math.round(Math.max(...bestDeals.map(p => p.intelligence?.savings_amount ?? 0)))} off`}
          />
          <ProductRow products={bestDeals} loading={isFetching} />
        </div>
      )}

      {/* ── Fastest Delivery ── */}
      {fastestDelivery.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Zap className="w-4 h-4 text-yellow-500" />}
            title="Fastest Delivery"
            subtitle="Get it in 10 minutes or less"
            href="/search?sort=fastest"
            live={isFromAPI}
          />
          <ProductRow products={fastestDelivery} loading={isFetching} />
        </div>
      )}

      {/* ── Under ₹100 ── */}
      {under100.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Tag className="w-4 h-4 text-green-600" />}
            title="Under ₹100"
            subtitle="Budget-friendly picks across all platforms"
            href="/search?max_price=100"
            live={isFromAPI}
          />
          <ProductRow products={under100} loading={isFetching} />
        </div>
      )}

      {/* ── Compare on 3+ Platforms ── */}
      {multiPlatform.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Sparkles className="w-4 h-4 text-blue-500" />}
            title="Compare on 3+ Platforms"
            subtitle="Most coverage — compare and save more"
            href="/search"
            live={isFromAPI}
          />
          <ProductRow products={multiPlatform} loading={isFetching} />
        </div>
      )}

      {/* ── Highly Recommended ── */}
      {highlyRecommended.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Star className="w-4 h-4 text-purple-500" />}
            title="Highly Recommended"
            subtitle="Highest savings potential when you compare"
            href="/search"
            live={isFromAPI}
          />
          <ProductRow products={highlyRecommended} loading={isFetching} />
        </div>
      )}

      {/* ── New Arrivals ── */}
      {newArrivals.length > 0 && newArrivals !== trendingNow && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Clock className="w-4 h-4 text-indigo-500" />}
            title="Recently Added"
            subtitle="New products with live price tracking"
            href="/search"
            live={isFromAPI}
          />
          <ProductRow products={newArrivals} loading={isFetching} />
        </div>
      )}

      {/* Shop by Category divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-surface-200" />
        <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">
          Shop by Category
        </span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>

      {/* ── Category rows ── */}
      {CATEGORY_SECTIONS.map(({ slug, label }) => {
        const categoryProducts = products
          .filter((p) => p.category?.slug === slug)
          .slice(0, 12);

        if (categoryProducts.length === 0) return null;

        const [emoji, ...words] = label.split(" ");
        const colors = CAT_COLORS[slug] ?? { bg: "#f5f5f5", text: "#525252" };

        return (
          <div key={slug} className="bg-white rounded-2xl p-4 shadow-sm">
            <SectionHeader
              icon={
                <span
                  className="text-lg w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: colors.bg }}
                >
                  {emoji}
                </span>
              }
              title={words.join(" ")}
              subtitle={`${categoryProducts.length} products`}
              href={`/search?category=${slug}`}
            />
            <ProductRow products={categoryProducts} loading={isFetching} />
          </div>
        );
      })}

      {/* ── Bottom CTA ── */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-5 text-center">
        <p className="text-white font-extrabold text-base mb-1">
          Can&apos;t find what you&apos;re looking for?
        </p>
        <p className="text-brand-100 text-sm mb-3">
          Search from {products.length}+ products across 7 platforms
        </p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 bg-white text-brand-700 font-extrabold
                     text-sm px-6 py-2.5 rounded-xl hover:bg-brand-50 transition-colors
                     shadow-md active:scale-95"
        >
          Search all products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
