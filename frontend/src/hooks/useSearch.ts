/**
 * Search hook with debounce and auto-suggestions via React Query.
 *
 * Two modes:
 *  1. Text search  — query.length >= 2 → calls GET /products/search?q=<query>
 *  2. Category / browse — no query, optional categorySlug → calls GET /products
 *
 * Both paths share the same React Query cache key so switching between them
 * never leaves stale data on screen.
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

  // Sync internal state when URL params change (e.g. SearchBar pushes new route).
  useEffect(() => {
    setQuery(initialQuery);
    setPage(1);
    setSort("relevance");
  }, [initialQuery]);

  useEffect(() => {
    setCategorySlug(initialCategory);
    setPage(1);
    setSort("relevance");
  }, [initialCategory]);

  // 350 ms debounce — fast enough to feel responsive, slow enough to avoid
  // hammering the API on every keystroke.
  const debouncedQuery = useDebounce(query, 350);

  // Track searches — only fire once per distinct debounced query string
  const lastTrackedQuery = useRef<string>("");
  useEffect(() => {
    if (debouncedQuery.length >= 2 && debouncedQuery !== lastTrackedQuery.current) {
      lastTrackedQuery.current = debouncedQuery;
      trackEvent({ event_type: "search", search_query: debouncedQuery, referrer_page: "search" });
    }
  }, [debouncedQuery]);

  // ── React Query ────────────────────────────────────────────────────────────
  // Key includes all filter dimensions so any change triggers a fresh fetch.
  const { data, isLoading, isError, isFetching, error } = useQuery<ProductSearchResult>({
    queryKey: ["search", debouncedQuery, page, sort, categorySlug],
    queryFn: async () => {
      const isTextSearch = debouncedQuery.length >= 2;

      if (isTextSearch) {
        // Dedicated search endpoint — GET /products/search?q=<query>
        const extraParams: Record<string, string | number> = { page, page_size: 20, sort };
        if (categorySlug) extraParams.category_slug = categorySlug;
        const { data } = await api.searchProducts(debouncedQuery, extraParams);
        return data;
      } else {
        // Category browse / "all products" — GET /products
        const params: Record<string, string | number> = { page, page_size: 20, sort };
        if (categorySlug) params.category_slug = categorySlug;
        const { data } = await api.listProducts(params);
        return data;
      }
    },
    // Always enabled — empty query shows all/category products; typed query
    // shows search results. The queryFn branches on debouncedQuery.length.
    enabled: true,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    // Retry once on network errors; don't retry on 4xx (bad query, etc.)
    retry: (failureCount, err: any) => {
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 1;
    },
  });

  // Trust the API sort — sending `sort` as a param is enough.
  const results = useMemo((): ProductSearchResult | undefined => data, [data]);

  // Derive suggestions from already-cached results — avoids a second request.
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
    error,
  };
}
