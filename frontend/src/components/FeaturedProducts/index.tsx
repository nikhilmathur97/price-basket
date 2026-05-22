"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/services/api";
import type { ProductWithPrices } from "@/types";
import { MOCK_PRODUCTS } from "@/lib/mockData";

export function FeaturedProducts() {
  const { data: products, isLoading } = useQuery<ProductWithPrices[]>({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data } = await api.getFeatured(20);
      return data;
    },
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  const displayProducts = (products && products.length > 0) ? products : MOCK_PRODUCTS.slice(0, 10);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {displayProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
