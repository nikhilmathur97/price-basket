import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Grocery Products",
  description:
    "Search and compare grocery prices across Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart and more. Find the cheapest price in seconds.",
  alternates: { canonical: "https://pricebasket.in/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
