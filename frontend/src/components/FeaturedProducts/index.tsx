"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/services/api";
import type { ProductWithPrices } from "@/types";
import { PackageSearch } from "lucide-react";

export function FeaturedProducts() {
  const { data: products, isLoading } = useQuery<ProductWithPrices[]>({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data } = await api.getFeatured(20);
      return data ?? [];
    },
    staleTime: 300_000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-surface-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <PackageSearch className="w-12 h-12 text-surface-300" />
        <p className="text-sm font-medium text-surface-500">
          Live prices loading — check back shortly!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
