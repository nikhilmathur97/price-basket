"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { ProductWithPrices } from "@/types";

interface ProductRowProps {
  title: string;
  categorySlug: string;
  products: ProductWithPrices[];
}

export function ProductRow({ title, categorySlug, products }: ProductRowProps) {
  if (!products.length) return null;

  return (
    <section className="mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-surface-900">{title}</h2>
        <Link
          href={`/search?category=${categorySlug}`}
          className="flex items-center gap-1 text-brand-600 text-sm font-semibold hover:text-brand-700 transition-colors"
        >
          See all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide
                      sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:overflow-visible">
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-44 sm:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
