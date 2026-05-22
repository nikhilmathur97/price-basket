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
  async rewrites() {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
