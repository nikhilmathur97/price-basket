/**
 * Search hook with debounce and auto-suggestions via React Query.
 */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, trackEvent } from "@/services/api";
import type { ProductSearchResult, ProductWithPrices } from "@/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useSearch(initialQuery = "", initialCategory?: string) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"relevance" | "price_asc" | "price_desc" | "fastest">("relevance");
  const [categorySlug, setCategorySlug] = useState<string | undefined>(initialCategory);

  // FIX #6: Sync internal query/category state when URL params change.
  // When SearchBar calls router.push('/search?q=butter'), the SearchResults
  // component re-renders with new useSearchParams() values. We must sync
  // the hook's internal state to match the new URL params so React Query
  // fires a new fetch with the updated query.
  useEffect(() => {
    setQuery(initialQuery);
    setPage(1);
  }, [initialQuery]);

  useEffect(() => {
    setCategorySlug(initialCategory);
    setPage(1);
  }, [initialCategory]);

  const debouncedQuery = useDebounce(query, 350);

  // Track searches — only fire once per distinct debounced query string
  const lastTrackedQuery = useRef<string>("");
  useEffect(() => {
    if (debouncedQuery.length >= 2 && debouncedQuery !== lastTrackedQuery.current) {
      lastTrackedQuery.current = debouncedQuery;
      trackEvent({ event_type: "search", search_query: debouncedQuery, referrer_page: "search" });
    }
  }, [debouncedQuery]);

  const { data, isLoading, isError, isFetching } = useQuery<ProductSearchResult>({
    queryKey: ["search", debouncedQuery, page, sort, categorySlug],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: 20, sort };
      if (debouncedQuery) params.q = debouncedQuery;
      if (categorySlug) params.category_slug = categorySlug;
      const { data } = await api.searchProducts(params);
      return data;
    },
    enabled: true,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  // Trust the API sort — sending `sort` as a param is enough.
  // Client-side re-sort would shadow the API's sort and use only the first
  // platform price, which may not match the server's cheapest-price logic.
  const results = useMemo((): ProductSearchResult | undefined => data, [data]);

  // Derive suggestions from the already-cached search results — avoids a
  // second parallel request to the same endpoint on every keystroke.
  const suggestions = useMemo((): { id: string; name: string; brand?: string | null }[] => {
    if (!data || debouncedQuery.length < 2) return [];
    return data.items.slice(0, 5).map((p: ProductWithPrices) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
    }));
  }, [data, debouncedQuery]);

  return {
    query,
    setQuery,
    page,
    setPage,
    sort,
    setSort,
    categorySlug,
    setCategorySlug,
    results,
    suggestions: suggestions ?? [],
    isLoading,
    isFetching,
    isError,
  };
}
