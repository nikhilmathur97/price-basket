import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Price Alerts — Get Notified on Price Drops",
  description:
    "Set a target price for any grocery product. PriceBasket notifies you by email when the price drops below your target on Blinkit, Zepto, BigBasket or any platform.",
  alternates: { canonical: "https://pricebasket.in/alerts" },
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
