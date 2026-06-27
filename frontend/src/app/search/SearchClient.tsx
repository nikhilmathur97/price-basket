"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { ProductCard } from "@/components/ProductCard";
import { PageLoader } from "@/components/PageLoader";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { extractApiError } from "@/services/api";
import Link from "next/link";

function SearchResults() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const initialCategory = params.get("category") ?? undefined;

  const {
    query,
    setQuery,
    results,
    isLoading,
    isFetching,
    isError,
    error,
    sort,
    setSort,
    page,
    setPage,
    categorySlug,
    setCategorySlug,
  } = useSearch(initialQuery, initialCategory);

  // Scroll to top on initial mount AND on every page change
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  // Also scroll to top when category or query changes (new search)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [categorySlug, query]);

  const totalPages = results ? Math.ceil(results.total / results.page_size) : 0;

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  // Full-page loader on initial load (no cached data yet)
  if (isLoading) {
    return <PageLoader message={categorySlug ? `Loading ${categorySlug.replace(/-/g, " ")}` : "Searching products"} />;
  }

  // Error state — show a friendly message with the API error detail
  if (isError) {
    const message = extractApiError(error, "Could not load products. Please try again.");
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-surface-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 page-enter" ref={topRef}>
      {/* Visible page heading — acts as the primary H1 for this view */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-surface-900">
            {query
              ? `Results for "${query}"`
              : categorySlug
              ? `${categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
              : "All Products"}
          </h2>
          {results && (
            <p className="text-sm text-surface-400 mt-0.5">
              {results.total.toLocaleString()} products found
            </p>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as any); setPage(1); }}
            className="appearance-none bg-white border border-surface-200 rounded-xl
                       px-4 py-2.5 pr-8 text-sm font-medium text-surface-700 cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="fastest">Fastest Delivery</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>
      </div>

      {/* Products grid */}
      <div className="relative">
        {/* Pagination loader overlay — clean spinner, no blur */}
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-16 pointer-events-none">
            <div className="flex items-center gap-2.5 bg-white shadow-xl rounded-2xl
                            px-5 py-3.5 border border-surface-100">
              <div
                className="w-5 h-5 rounded-full border-2 border-brand-200 border-t-brand-600"
                style={{ animation: "spin 0.7s linear infinite" }}
              />
              <span className="text-sm font-semibold text-surface-700">Loading products…</span>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 transition-opacity duration-200 ${isFetching ? "opacity-40" : "opacity-100"}`}>
          {results?.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {results?.items.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">{categorySlug && !query ? "🛒" : "🔍"}</div>
          <p className="font-semibold text-surface-700 mb-2">
            {categorySlug && !query ? "Coming soon" : "No products found"}
          </p>
          <p className="text-sm text-surface-400">
            {categorySlug && !query
              ? "We're adding products to this category. Check back soon!"
              : "Try different keywords or browse categories"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {results && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isFetching}
            className="btn-secondary disabled:opacity-40 flex items-center gap-1.5"
          >
            {isFetching && page > 1 ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Previous
          </button>

          {/* Page number pills */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isFetching}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                    pageNum === page
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white border border-surface-200 text-surface-600 hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isFetching}
            className="btn-secondary disabled:opacity-40 flex items-center gap-1.5"
          >
            Next
            {isFetching && page < totalPages ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
          </button>
        </div>
      )}

      {/* Page info */}
      {results && totalPages > 1 && (
        <p className="text-center text-xs text-surface-400 mt-3">
          Page {page} of {totalPages} · {results.total.toLocaleString()} products
        </p>
      )}

      {/* SEO content section — static H2s for content structure */}
      <section className="mt-16 border-t border-surface-100 pt-10">
        <h2 className="text-lg font-bold text-surface-800 mb-3">
          Compare Grocery Prices Across All Platforms
        </h2>
        <p className="text-sm text-surface-500 mb-6 max-w-2xl">
          PriceBasket searches Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart and more in real time — so you always pay the lowest price on groceries, staples, and daily essentials.
        </p>

        <h2 className="text-lg font-bold text-surface-800 mb-3">
          Popular Categories
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: "Atta & Flour", slug: "atta" },
            { label: "Rice & Grains", slug: "rice" },
            { label: "Cooking Oil", slug: "oil" },
            { label: "Dal & Pulses", slug: "dal" },
            { label: "Milk & Dairy", slug: "dairy" },
            { label: "Sugar & Salt", slug: "sugar" },
            { label: "Ghee & Butter", slug: "ghee" },
            { label: "Eggs", slug: "eggs" },
          ].map(({ label, slug }) => (
            <Link
              key={slug}
              href={`/search?category=${slug}`}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-surface-50 border border-surface-200 text-surface-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <h2 className="text-lg font-bold text-surface-800 mb-3">
          Best Deals Today
        </h2>
        <p className="text-sm text-surface-500 max-w-2xl">
          Looking for the best grocery deals? Check our{" "}
          <Link href="/best-grocery-deals" className="text-brand-600 hover:underline font-medium">
            best grocery deals
          </Link>{" "}
          page or compare platforms like{" "}
          <Link href="/compare/blinkit-vs-zepto" className="text-brand-600 hover:underline font-medium">
            Blinkit vs Zepto
          </Link>{" "}
          and{" "}
          <Link href="/compare/blinkit-vs-bigbasket" className="text-brand-600 hover:underline font-medium">
            Blinkit vs BigBasket
          </Link>{" "}
          to find where your cart is cheapest.
        </p>
      </section>
    </div>
  );
}

export default function SearchClient() {
  return (
    <Suspense fallback={<PageLoader message="Searching products" />}>
      <SearchResults />
    </Suspense>
  );
}
