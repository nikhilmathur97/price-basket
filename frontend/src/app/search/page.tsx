import type { Metadata } from "next";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search Grocery Prices — Blinkit, Zepto & BigBasket",
  description:
    "Search and compare grocery prices across Blinkit, Zepto, BigBasket, Instamart & JioMart. Find the cheapest price for any product in seconds. Free.",
  alternates: { canonical: "https://pricebasket.in/search" },
  openGraph: {
    title: "Search Grocery Prices — Blinkit, Zepto & BigBasket",
    description: "Compare grocery prices across 8 platforms instantly. Find cheapest Blinkit, Zepto, BigBasket prices. Free.",
    url: "https://pricebasket.in/search",
    type: "website",
  },
};

export default function SearchPage() {
  return (
    <>
      {/* Static H1 — always present in server-rendered HTML for SEO crawlers */}
      <h1 className="sr-only">Search Grocery Products — Compare Prices on Blinkit, Zepto, Instamart &amp; More</h1>

      {/* Static H2s — server-rendered so crawlers always see them regardless of
          client-side hydration state. These mirror the SEO section in SearchClient
          and satisfy the ≥2 H2 requirement for content structure. */}
      <h2 className="sr-only">Compare Grocery Prices Across All Platforms</h2>
      <h2 className="sr-only">Popular Categories — Atta, Rice, Oil, Dal, Milk &amp; More</h2>
      <h2 className="sr-only">Best Grocery Deals Today on Blinkit, Zepto &amp; BigBasket</h2>

      <SearchClient />
    </>
  );
}
