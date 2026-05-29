import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { TopProgressBar } from "@/components/TopProgressBar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { ChatBot } from "@/components/ChatBot";
import { BackendWarmup } from "@/components/BackendWarmup";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Price Basket — Compare Prices Across Blinkit, Zepto & More",
    template: "%s | Price Basket",
  },
  description:
    "Compare grocery & essentials prices across Blinkit, Zepto, BigBasket, Swiggy Instamart, Flipkart, Amazon, JioMart & more. Save up to 40% with real-time price intelligence.",
  keywords: [
    "grocery price comparison", "blinkit prices", "zepto prices", "bigbasket",
    "swiggy instamart", "quick commerce india", "cheapest grocery", "price comparison india",
    "best deals grocery", "online grocery comparison",
  ],
  metadataBase: new URL("https://pricebasket.in"),
  openGraph: {
    title: "Price Basket — Compare Prices Across 10 Platforms",
    description: "Real-time price comparison across Blinkit, Zepto, BigBasket, Instamart & more. Save money on every order.",
    url: "https://pricebasket.in",
    siteName: "Price Basket",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Price Basket — Compare grocery prices across all platforms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Price Basket — Compare Prices Across 10 Platforms",
    description: "Real-time price comparison across Blinkit, Zepto, BigBasket & more.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  alternates: {
    canonical: "https://pricebasket.in",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <BackendWarmup />
          <TopProgressBar />
          <Header />
          {/* pb-[58px] on mobile reserves space for the fixed BottomNav */}
          <main className="min-h-[calc(100vh-56px)] pb-[58px] md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <CartDrawer />
          <ChatBot />
          <Toaster
            position="top-center"
            containerStyle={{ zIndex: 999999 }}
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: "12px",
                fontFamily: "var(--font-inter)",
                fontSize: "14px",
                fontWeight: "500",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              },
              success: {
                iconTheme: { primary: "#ea580c", secondary: "#fff" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
