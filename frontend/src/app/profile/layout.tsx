import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your PriceBasket profile, delivery address, and notification preferences.",
  alternates: { canonical: "https://pricebasket.in/profile" },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
