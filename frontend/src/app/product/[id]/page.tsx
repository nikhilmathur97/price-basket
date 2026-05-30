import type { Metadata } from "next";

import ProductDetailClient from "./ProductDetailClient";
import { fetchProduct, clampDescription, SITE_URL } from "@/lib/server-api";

interface PageProps {
  params: { id: string };
}

// ── SEO metadata (server-rendered, per product) ─────────────────────────────
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const product = await fetchProduct(params.id);

  // Mock/demo products or fetch failures fall back to generic, still-valid meta.
  if (!product) {
    return {
      title: "Compare Prices Across Blinkit, Zepto & More",
      description:
        "Compare live grocery prices across Blinkit, Zepto, BigBasket, Instamart & more on PriceBasket.",
      alternates: { canonical: `${SITE_URL}/product/${params.id}` },
    };
  }

  const prices = (product.platform_prices ?? []).filter((p) => p.is_available);
  const best = prices.length
    ? Math.min(...prices.map((p) => p.price))
    : null;
  const platformCount = prices.length;
  const brandPrefix = product.brand ? `${product.brand} ` : "";

  const title = best
    ? `${brandPrefix}${product.name}${product.unit ? ` (${product.unit})` : ""} — Lowest Price ₹${best}`
    : `${brandPrefix}${product.name} — Price Comparison`;

  const description = clampDescription(
    best
      ? `Compare ${product.name}${product.unit ? ` ${product.unit}` : ""} prices across ${platformCount} platform${platformCount === 1 ? "" : "s"}. Lowest price ₹${best}${product.cheapest_platform ? ` on ${product.cheapest_platform.name}` : ""}. Live price tracking & alerts on PriceBasket.`
      : product.description ||
          `Compare ${product.name} prices across Blinkit, Zepto, BigBasket & more on PriceBasket.`,
  );

  const image = product.image_url ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/product/${product.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/product/${product.id}`,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// ── Product / Offer structured data for Google rich results ─────────────────
export default async function ProductPage({ params }: PageProps) {
  const product = await fetchProduct(params.id);

  let jsonLd: Record<string, unknown> | null = null;
  if (product) {
    const prices = (product.platform_prices ?? []).filter(
      (p) => p.is_available && p.price > 0,
    );
    const lowPrice = prices.length
      ? Math.min(...prices.map((p) => p.price))
      : null;
    const highPrice = prices.length
      ? Math.max(...prices.map((p) => p.price))
      : null;

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      ...(product.brand
        ? { brand: { "@type": "Brand", name: product.brand } }
        : {}),
      ...(product.description ? { description: product.description } : {}),
      ...(product.image_url ? { image: product.image_url } : {}),
      ...(product.category?.name ? { category: product.category.name } : {}),
      ...(product.unit ? { size: product.unit } : {}),
      url: `${SITE_URL}/product/${product.id}`,
      ...(lowPrice != null && highPrice != null
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "INR",
              lowPrice,
              highPrice,
              offerCount: prices.length,
              availability: "https://schema.org/InStock",
            },
          }
        : {}),
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Structured data is built from our own backend data — safe to inline.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetailClient />
    </>
  );
}
