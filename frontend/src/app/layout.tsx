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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Price Basket — Smart Quick Commerce",
    template: "%s | Price Basket",
  },
  description:
    "Compare grocery prices across Blinkit, Zepto, BigBasket & Swiggy Instamart. Save money with real-time price intelligence.",
  keywords: ["grocery", "price comparison", "blinkit", "zepto", "quick commerce", "best deals"],
  metadataBase: new URL("http://test.pricebasket.in"),
  openGraph: {
    title: "Price Basket",
    description: "Real-time price comparison across all quick commerce platforms",
    url: "http://test.pricebasket.in",
    siteName: "Price Basket",
    type: "website",
    locale: "en_IN",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
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
          <TopProgressBar />
          <Header />
          {/* pb-[58px] on mobile reserves space for the fixed BottomNav */}
          <main className="min-h-[calc(100vh-56px)] pb-[58px] md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <CartDrawer />
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
