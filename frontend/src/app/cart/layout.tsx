import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Cart — Compare & Optimise",
  description:
    "See live prices for every item in your cart across Blinkit, Zepto, BigBasket and more. Find the cheapest platform to buy everything.",
  alternates: { canonical: "https://pricebasket.in/cart" },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
