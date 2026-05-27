"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Package,
  Tag,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  XCircle,
  LayoutGrid,
} from "lucide-react";
import { api } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlatformPrice {
  platform_slug: string;
  platform_name: string;
  color_hex: string | null;
  price: number;
}

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  unit: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  category_slug: string;
  category_name: string | null;
  prices: PlatformPrice[];
  platform_count: number;
  cheapest_price: number | null;
  has_image: boolean;
  has_prices: boolean;
  mismatch: boolean;
  expected_category: string | null;
}

interface CatalogCategory {
  slug: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  products: CatalogProduct[];
  product_count: number;
  with_image: number;
  with_prices: number;
  mismatches: number;
}

interface MismatchEntry {
  product_id: string;
  product_name: string;
  current_category: string;
  expected_category: string;
}

interface CatalogData {
  total_categories: number;
  total_products: number;
  total_mismatches: number;
  mismatches: MismatchEntry[];
  categories: CatalogCategory[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PlatformBadge({ p }: { p: PlatformPrice }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
      style={{
        borderColor: p.color_hex ?? "#e2e8f0",
        color: p.color_hex ?? "#64748b",
        backgroundColor: p.color_hex ? `${p.color_hex}18` : "#f8fafc",
      }}
    >
      {p.platform_name} ₹{p.price}
    </span>
  );
}

function ProductRow({ product }: { product: CatalogProduct }) {
  return (
    <tr className={`border-b border-surface-50 hover:bg-surface-50/50 transition-colors ${product.mismatch ? "bg-amber-50/40" : ""}`}>
      {/* Image */}
      <td className="py-2 px-3 w-12">
        {product.image_url ? (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-100 flex-shrink-0">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="40px"
              className="object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
            <ImageOff className="w-4 h-4 text-surface-300" />
          </div>
        )}
      </td>

      {/* Name + badges */}
      <td className="py-2 px-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate max-w-[220px]">{product.name}</p>
            {product.brand && (
              <p className="text-[11px] text-surface-400">{product.brand} {product.unit ? `· ${product.unit}` : ""}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5 flex-shrink-0">
            {product.is_featured && (
              <span className="text-[9px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">Featured</span>
            )}
            {!product.is_active && (
              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
        </div>
      </td>

      {/* Image status */}
      <td className="py-2 px-3 text-center">
        {product.has_image ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 mx-auto" />
        )}
      </td>

      {/* Price + platforms */}
      <td className="py-2 px-3">
        {product.has_prices ? (
          <div className="space-y-1">
            <p className="text-sm font-bold text-surface-900">
              ₹{product.cheapest_price}
            </p>
            <div className="flex flex-wrap gap-1">
              {product.prices.map((p) => (
                <PlatformBadge key={p.platform_slug} p={p} />
              ))}
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-surface-400 italic">No prices</span>
        )}
      </td>

      {/* Mismatch */}
      <td className="py-2 px-3">
        {product.mismatch ? (
          <div className="flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-amber-700">Mismatch</p>
              <p className="text-[10px] text-surface-500">
                Expected: <span className="font-medium text-surface-700">{product.expected_category}</span>
              </p>
            </div>
          </div>
        ) : (
          <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
        )}
      </td>
    </tr>
  );
}

function CategorySection({ cat, defaultOpen }: { cat: CatalogCategory; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{cat.icon ?? "📦"}</span>
          <div>
            <h3 className="font-semibold text-surface-900">{cat.name}</h3>
            <p className="text-xs text-surface-500">{cat.slug}</p>
          </div>
          {!cat.is_active && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Stats pills */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs bg-surface-100 text-surface-600 px-2 py-1 rounded-full">
              <Package className="w-3 h-3" />{cat.product_count} products
            </span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              cat.with_image === cat.product_count
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}>
              <Tag className="w-3 h-3" />{cat.with_image}/{cat.product_count} images
            </span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              cat.with_prices === cat.product_count
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}>
              ₹ {cat.with_prices}/{cat.product_count} priced
            </span>
            {cat.mismatches > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                <AlertTriangle className="w-3 h-3" />{cat.mismatches} mismatches
              </span>
            )}
          </div>
          {open ? (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-surface-400" />
          )}
        </div>
      </button>

      {/* Product table */}
      {open && (
        <div className="border-t border-surface-100 overflow-x-auto">
          {cat.products.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6">No products in this category</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-left">
                  <th className="py-2 px-3 text-[11px] font-semibold text-surface-500 w-12">Img</th>
                  <th className="py-2 px-3 text-[11px] font-semibold text-surface-500">Product</th>
                  <th className="py-2 px-3 text-[11px] font-semibold text-surface-500 text-center">Has Image</th>
                  <th className="py-2 px-3 text-[11px] font-semibold text-surface-500">Price / Platforms</th>
                  <th className="py-2 px-3 text-[11px] font-semibold text-surface-500 text-center">Category Match</th>
                </tr>
              </thead>
              <tbody>
                {cat.products.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCatalogPage() {
  const [search, setSearch] = useState("");
  const [showMismatchOnly, setShowMismatchOnly] = useState(false);

  const { data, isLoading, error } = useQuery<CatalogData>({
    queryKey: ["admin-catalog"],
    queryFn: async () => {
      const res = await api.getAdminCatalog();
      return res.data;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        <span className="text-surface-600">Loading catalog…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6 text-center text-red-500">
        Failed to load catalog data.
      </div>
    );
  }

  // Filter categories/products by search + mismatch toggle
  const filteredCategories = data.categories
    .map((cat) => {
      const filteredProducts = cat.products.filter((p) => {
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.brand ?? "").toLowerCase().includes(search.toLowerCase());
        const matchesMismatch = !showMismatchOnly || p.mismatch;
        return matchesSearch && matchesMismatch;
      });
      return { ...cat, products: filteredProducts, product_count: filteredProducts.length };
    })
    .filter((cat) => cat.products.length > 0 || (!search && !showMismatchOnly));

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-4">
          <LayoutGrid className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-surface-900">Catalog Audit</h2>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-surface-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-surface-900">{data.total_categories}</p>
            <p className="text-xs text-surface-500 mt-0.5">Categories</p>
          </div>
          <div className="bg-surface-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-surface-900">{data.total_products}</p>
            <p className="text-xs text-surface-500 mt-0.5">Products</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-green-700">
              {data.categories.reduce((s, c) => s + c.with_prices, 0)}
            </p>
            <p className="text-xs text-green-600 mt-0.5">With Prices</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${data.total_mismatches > 0 ? "bg-amber-50" : "bg-green-50"}`}>
            <p className={`text-2xl font-extrabold ${data.total_mismatches > 0 ? "text-amber-700" : "text-green-700"}`}>
              {data.total_mismatches}
            </p>
            <p className={`text-xs mt-0.5 ${data.total_mismatches > 0 ? "text-amber-600" : "text-green-600"}`}>
              Mismatches
            </p>
          </div>
        </div>

        {/* Mismatch alert banner */}
        {data.total_mismatches > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {data.total_mismatches} product{data.total_mismatches !== 1 ? "s" : ""} may be in the wrong category
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  These products were detected by keyword analysis as potentially belonging to a different category.
                  Review and reassign if needed.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.mismatches.slice(0, 5).map((m) => (
                    <span key={m.product_id} className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {m.product_name} → {m.expected_category}
                    </span>
                  ))}
                  {data.mismatches.length > 5 && (
                    <span className="text-[10px] text-amber-600">+{data.mismatches.length - 5} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search products or brands…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showMismatchOnly}
              onChange={(e) => setShowMismatchOnly(e.target.checked)}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Mismatches only
          </label>
        </div>
      </div>

      {/* Category sections */}
      {filteredCategories.length === 0 ? (
        <div className="card p-10 text-center text-surface-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No products match your filters</p>
        </div>
      ) : (
        filteredCategories.map((cat, i) => (
          <CategorySection
            key={cat.slug}
            cat={cat}
            defaultOpen={i === 0 || showMismatchOnly || !!search}
          />
        ))
      )}
    </div>
  );
}
