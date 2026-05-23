/**
 * Search hook with debounce and auto-suggestions via React Query.
 */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, trackEvent } from "@/services/api";
import type { ProductSearchResult } from "@/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"relevance" | "price_asc" | "price_desc" | "fastest">("relevance");
  const [categorySlug, setCategorySlug] = useState<string | undefined>();

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

  // Return only real API results — no mock padding
  const results = useMemo((): ProductSearchResult | undefined => {
    if (!data) return undefined;

    const items = [...data.items];
    if (sort === "price_asc") {
      items.sort(
        (a, b) =>
          (a.platform_prices?.[0]?.price ?? Infinity) -
          (b.platform_prices?.[0]?.price ?? Infinity)
      );
    } else if (sort === "price_desc") {
      items.sort(
        (a, b) =>
          (b.platform_prices?.[0]?.price ?? 0) -
          (a.platform_prices?.[0]?.price ?? 0)
      );
    }

    return { ...data, items };
  }, [data, sort]);

  // Auto-suggestions (lighter query while typing)
  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const { data } = await api.searchProducts({ q: debouncedQuery, page_size: 5 });
      return data.items.map((p: any) => ({ id: p.id, name: p.name, brand: p.brand }));
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

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
