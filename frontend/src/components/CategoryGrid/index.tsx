"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/services/api";
import type { Category } from "@/types";
import { MOCK_CATEGORIES } from "@/lib/mockData";

export function CategoryGrid() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.getCategories();
      return data;
    },
    staleTime: 3600_000,
  });

  const displayCategories = (categories && categories.length > 0) ? categories : MOCK_CATEGORIES;

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-20 w-20 rounded-2xl flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {displayCategories.map((cat) => (
        <Link
          key={cat.id}
          href={`/search?category=${cat.slug}`}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
        >
          <div className="w-20 h-20 bg-white rounded-2xl border border-surface-100 shadow-card
                          flex items-center justify-center text-3xl
                          group-hover:border-brand-200 group-hover:shadow-hover transition-all duration-150">
            {cat.icon ?? "🛒"}
          </div>
          <span className="text-xs font-medium text-surface-600 text-center w-20 truncate">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
