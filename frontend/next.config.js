/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      // Blinkit / Grofers CDN (primary image source for scraped products)
      { hostname: "cdn.blinkit.com" },
      { hostname: "cdn.grofers.com" },
      // Zepto
      { hostname: "cdn.zeptonow.com" },
      // BigBasket
      { hostname: "www.bigbasket.com" },
      { hostname: "bb-website-live.s3.amazonaws.com" },
      // Swiggy Instamart
      { hostname: "media-assets.swiggy.com" },
      // JioMart
      { hostname: "www.jiomart.com" },
      // Amazon
      { hostname: "m.media-amazon.com" },
      // Flipkart
      { hostname: "static-assets-web.flixcart.com" },
      { hostname: "rukminim2.fliximg.com" },
      // PriceBasket assets
      { hostname: "pricebasket-assets.s3.ap-south-1.amazonaws.com" },
      { hostname: "test.pricebasket.in" },
      // Generic / fallback
      { hostname: "logo.clearbit.com" },
      { hostname: "images.pexels.com" },
      { hostname: "picsum.photos" },
      { hostname: "images.unsplash.com" },
      { hostname: "upload.wikimedia.org" },
      { hostname: "play-lh.googleusercontent.com" },
      { hostname: "placehold.co" },
      { hostname: "ui-avatars.com" },
      // Myntra / Nykaa
      { hostname: "assets.myntassets.com" },
      { hostname: "adn-static1.nykaa.com" },
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
