"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { PageLoader } from "@/components/PageLoader";
import { SlidersHorizontal, ChevronDown, Loader2 } from "lucide-react";

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoader message="Searching products" />}>
      <SearchResults />
    </Suspense>
  );
}

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

  // Full-page loader on initial load
  if (isLoading) {
    return <PageLoader message={categorySlug ? `Loading ${categorySlug.replace(/-/g, " ")}` : "Searching products"} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 page-enter" ref={topRef}>
      {/* Mobile search bar */}
      <div className="md:hidden mb-4">
        <SearchBar autoFocus />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {query
              ? `Results for "${query}"`
              : categorySlug
              ? `${categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
              : "All Products"}
          </h1>
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
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-semibold text-surface-700 mb-2">No products found</p>
          <p className="text-sm text-surface-400">
            Try different keywords or browse categories
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
    </div>
  );
}
