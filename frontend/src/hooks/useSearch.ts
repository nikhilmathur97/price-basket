/**
 * Search hook with debounce and auto-suggestions via React Query.
 */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, trackEvent } from "@/services/api";
import { MOCK_PRODUCTS } from "@/lib/mockData";
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

  // Merge mock products into results so guests see the full catalogue.
  // Mock products have slug IDs (never UUID) so there are no duplicate IDs.
  const results = useMemo((): ProductSearchResult | undefined => {
    if (!data) return undefined;

    // Filter mock products by query (case-insensitive name / brand / category match)
    const q = debouncedQuery.toLowerCase();
    const filteredMocks = q
      ? MOCK_PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.brand ?? "").toLowerCase().includes(q) ||
            (p.category?.name ?? "").toLowerCase().includes(q)
        )
      : MOCK_PRODUCTS;

    // Avoid duplicating products that already exist in the API result set
    const apiIds = new Set(data.items.map((p) => p.id));
    const uniqueMocks = filteredMocks.filter((p) => !apiIds.has(p.id));

    // Sort merged list client-side when a sort other than "relevance" is chosen
    const merged = [...data.items, ...uniqueMocks];
    if (sort === "price_asc") {
      merged.sort(
        (a, b) =>
          (a.platform_prices?.[0]?.price ?? Infinity) -
          (b.platform_prices?.[0]?.price ?? Infinity)
      );
    } else if (sort === "price_desc") {
      merged.sort(
        (a, b) =>
          (b.platform_prices?.[0]?.price ?? 0) -
          (a.platform_prices?.[0]?.price ?? 0)
      );
    }

    return {
      ...data,
      items: merged,
      total: data.total + uniqueMocks.length,
    };
  }, [data, debouncedQuery, sort]);

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
