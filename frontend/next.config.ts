import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cdn.blinkit.com" },
      { hostname: "cdn.zeptonow.com" },
      { hostname: "www.bigbasket.com" },
      { hostname: "media-assets.swiggy.com" },
      { hostname: "pricebasket-assets.s3.ap-south-1.amazonaws.com" },
      { hostname: "test.pricebasket.in" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
