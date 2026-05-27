/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { hostname: "cdn.blinkit.com" },
      { hostname: "cdn.grofers.com" },
      { hostname: "cdn.zeptonow.com" },
      { hostname: "www.bigbasket.com" },
      { hostname: "bb-website-live.s3.amazonaws.com" },
      { hostname: "media-assets.swiggy.com" },
      { hostname: "pricebasket-assets.s3.ap-south-1.amazonaws.com" },
      { hostname: "test.pricebasket.in" },
      { hostname: "placehold.co" },
      { hostname: "picsum.photos" },
      { hostname: "images.unsplash.com" },
      { hostname: "images.pexels.com" },
      { hostname: "ui-avatars.com" },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/* calls to the FastAPI backend running on the same server.
        // The browser never needs to reach port 8000 — Next.js handles it server-side.
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

module.exports = nextConfig;

