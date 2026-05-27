"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import type { Metadata } from "next";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            onChange={(e) => setSort(e.target.value as any)}
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
      {isLoading ? (
        <SearchSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
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
          {results && results.total > results.page_size && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-sm text-surface-600">
                Page {page} of {Math.ceil(results.total / results.page_size)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(results.total / results.page_size)}
                className="btn-secondary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-6 right-6 bg-surface-900 text-white text-xs
                        px-3 py-2 rounded-full shadow-lg">
          Updating prices...
        </div>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="skeleton h-64 rounded-2xl" />
      ))}
    </div>
  );
}
