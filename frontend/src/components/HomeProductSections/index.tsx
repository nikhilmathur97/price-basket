"use client";

/**
 * HomeProductSections
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders home page product rows.
 *
 * Loading strategy:
 *   1. Instantly show mock data as placeholder (zero-flash UX).
 *   2. React Query fetches real API data in background (staleTime = 5 min).
 *   3. When API resolves, swap seamlessly — no skeleton flash.
 *   4. Category sections only render when products exist for that category.
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORY_SECTIONS } from "@/lib/mockData";
import type { ProductWithPrices } from "@/types";
import Link from "next/link";
import { Flame, Zap, Star, TrendingUp, ArrowRight, RefreshCw, PackageSearch } from "lucide-react";

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
  "pet-care":          { bg: "#EFEBE9", text: "#4E342E" },
  "staples":           { bg: "#FFFDE7", text: "#F57F17" },
  "oils-spices":       { bg: "#FFF3E0", text: "#BF360C" },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
  live,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  live?: boolean;
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
        </h2>
        {subtitle && <p className="text-[11px] text-surface-400 mt-0.5">{subtitle}</p>}
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
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
      {products.map((p) => (
        <div
          key={p.id}
          className={`w-[160px] sm:w-[175px] flex-shrink-0 snap-start transition-opacity duration-300 ${
            loading ? "opacity-60" : "opacity-100"
          }`}
        >
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-[160px] sm:w-[175px] flex-shrink-0 rounded-2xl overflow-hidden bg-white border border-surface-100 shadow-sm">
      <div className="aspect-square bg-surface-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-surface-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-surface-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-surface-100 rounded animate-pulse w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-5 bg-surface-100 rounded animate-pulse w-14" />
          <div className="h-8 bg-surface-100 rounded-xl animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

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
    </div>
  );
}

export function HomeProductSections() {
  const [slowLoad, setSlowLoad] = useState(false);

  const { data: apiProducts, isLoading, isFetching } = useQuery<ProductWithPrices[]>({
    queryKey: ["featured-home"],
    queryFn: async () => {
      const { data } = await api.getFeatured(20);
      return data ?? [];
    },
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  // After 5 s of loading, show a friendly "waking up" hint
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setSlowLoad(true), 5_000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {slowLoad && (
          <div className="flex items-center justify-center gap-2 py-2 bg-orange-50 rounded-xl border border-orange-100">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-[12px] font-medium text-orange-600 ml-1">
              Waking up servers, please wait a moment…
            </span>
          </div>
        )}
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-5 w-40 bg-surface-200 rounded animate-pulse mb-3" />
            <SkeletonRow />
          </div>
        ))}
      </div>
    );
  }

  const products: ProductWithPrices[] = apiProducts ?? [];
  const isFromAPI = products.length > 0;

  // Derive sections
  const trendingNow = products.slice(0, 10);
  const bestDeals = [...products]
    .filter((p) => p.intelligence.savings_amount > 5)
    .sort((a, b) => b.intelligence.savings_amount - a.intelligence.savings_amount)
    .slice(0, 10);
  const fastestDelivery = [...products]
    .sort(
      (a, b) =>
        (a.coverage_summary.best_eta_minutes ?? 999) -
        (b.coverage_summary.best_eta_minutes ?? 999)
    )
    .slice(0, 10);
  const highlyRecommended = [...products]
    .sort((a, b) => b.intelligence.price_spread_percent - a.intelligence.price_spread_percent)
    .slice(0, 10);

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">

      {/* Live price indicator strip */}
      {isFromAPI && (
        <div className="flex items-center justify-center gap-2 py-1.5 bg-green-50 rounded-xl border border-green-100">
          <RefreshCw className={`w-3 h-3 text-green-600 ${isFetching ? "animate-spin" : ""}`} />
          <span className="text-[11px] font-semibold text-green-700">
            {isFetching ? "Refreshing live prices…" : `${products.length} products with live prices`}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}

      {/* Trending Now */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader
          icon={<TrendingUp className="w-4 h-4 text-brand-600" />}
          title="Trending Now"
          subtitle="Most searched products"
          href="/search"
          live={isFromAPI}
        />
        {<ProductRow products={trendingNow} loading={isFetching} />}
      </div>

      {/* Best Deals */}
      {(bestDeals.length > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            title="Best Deals Today"
            subtitle="Biggest savings across all platforms"
            href="/search?sort=discount"
            live={isFromAPI}
          />
          {<ProductRow products={bestDeals} loading={isFetching} />}
        </div>
      )}

      {/* Fastest Delivery */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader
          icon={<Zap className="w-4 h-4 text-yellow-500" />}
          title="Fastest Delivery"
          subtitle="Get it in 10 minutes"
          href="/search?sort=fastest"
          live={isFromAPI}
        />
        {<ProductRow products={fastestDelivery} loading={isFetching} />}
      </div>

      {/* Highly Recommended */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader
          icon={<Star className="w-4 h-4 text-purple-500" />}
          title="Highly Recommended"
          subtitle="Highest savings potential when you compare"
          href="/search"
          live={isFromAPI}
        />
        {<ProductRow products={highlyRecommended} loading={isFetching} />}
      </div>

      {/* Shop by Category divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-surface-200" />
        <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">
          Shop by Category
        </span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>

      {/* Category rows */}
      {CATEGORY_SECTIONS.map(({ slug, label }) => {
        const categoryProducts = products
          .filter((p) => p.category?.slug === slug)
          .slice(0, 10);

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
              href={`/search?category=${slug}`}
            />
            <ProductRow products={categoryProducts} loading={isFetching} />
          </div>
        );
      })}
    </div>
  );
}
