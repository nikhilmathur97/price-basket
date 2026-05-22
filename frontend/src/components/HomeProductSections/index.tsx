"use client";

/**
 * HomeProductSections
 * Fetches featured products from the API, then sorts into sections.
 * Falls back to MOCK_PRODUCTS only when the API returns nothing (demo/dev env).
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { MOCK_PRODUCTS, CATEGORY_SECTIONS, getProductsByCategory } from "@/lib/mockData";
import type { ProductWithPrices } from "@/types";
import Link from "next/link";
import { Flame, Zap, Star, TrendingUp, ArrowRight } from "lucide-react";

// ── Colour accents (same as page.tsx) ─────────────────────────────────────
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

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-[15px] font-extrabold text-surface-900 flex items-center gap-1.5">
          {icon}
          {title}
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

function ProductRow({ products }: { products: ProductWithPrices[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
      {products.map((p) => (
        <div key={p.id} className="w-[160px] sm:w-[175px] flex-shrink-0 snap-start">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[160px] sm:w-[175px] flex-shrink-0 h-52 rounded-2xl skeleton" />
      ))}
    </div>
  );
}

export function HomeProductSections() {
  const { data: apiProducts, isLoading } = useQuery<ProductWithPrices[]>({
    queryKey: ["featured-home"],
    queryFn: async () => {
      const { data } = await api.getFeatured(60);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Use API products when available; fall back to mock
  const products: ProductWithPrices[] =
    apiProducts && apiProducts.length > 0 ? apiProducts : MOCK_PRODUCTS;

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
    .sort(
      (a, b) => b.intelligence.price_spread_percent - a.intelligence.price_spread_percent
    )
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Trending Now */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader
          icon={<TrendingUp className="w-4 h-4 text-brand-600" />}
          title="Trending Now"
          subtitle="Most searched products"
          href="/search"
        />
        {isLoading ? <SkeletonRow /> : <ProductRow products={trendingNow} />}
      </div>

      {/* Best Deals */}
      {(isLoading || bestDeals.length > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionHeader
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            title="Best Deals Today"
            subtitle="Biggest savings across all platforms"
            href="/search?sort=discount"
          />
          {isLoading ? <SkeletonRow /> : <ProductRow products={bestDeals} />}
        </div>
      )}

      {/* Fastest Delivery */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader
          icon={<Zap className="w-4 h-4 text-yellow-500" />}
          title="Fastest Delivery"
          subtitle="Get it in 10 minutes"
          href="/search?sort=fastest"
        />
        {isLoading ? <SkeletonRow /> : <ProductRow products={fastestDelivery} />}
      </div>

      {/* Highly Recommended */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionHeader
          icon={<Star className="w-4 h-4 text-purple-500" />}
          title="Highly Recommended"
          subtitle="Highest savings potential when you compare"
          href="/search"
        />
        {isLoading ? <SkeletonRow /> : <ProductRow products={highlyRecommended} />}
      </div>

      {/* ── Shop by Category ── */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-surface-200" />
        <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">
          Shop by Category
        </span>
        <div className="flex-1 h-px bg-surface-200" />
      </div>

      {CATEGORY_SECTIONS.map(({ slug, label }) => {
        // For API products, filter by category slug; for mock, use helper
        const categoryProducts =
          apiProducts && apiProducts.length > 0
            ? apiProducts
                .filter((p) => p.category?.slug === slug)
                .slice(0, 10)
            : getProductsByCategory(slug);

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
            {isLoading ? <SkeletonRow /> : <ProductRow products={categoryProducts} />}
          </div>
        );
      })}
    </div>
  );
}
