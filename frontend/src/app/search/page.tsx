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
      {/* Static H1 always present in server-rendered HTML for SEO crawlers */}
      <h1 className="sr-only">Search Grocery Products — Compare Prices on Blinkit, Zepto, Instamart &amp; More</h1>
      <SearchClient />
    </>
  );
}
