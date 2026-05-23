import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cdn.blinkit.com" },
      { hostname: "**.blinkit.com" },
      { hostname: "cdn.zeptonow.com" },
      { hostname: "**.zeptonow.com" },
      { hostname: "www.bigbasket.com" },
      { hostname: "media-assets.swiggy.com" },
      { hostname: "pricebasket-assets.s3.ap-south-1.amazonaws.com" },
      { hostname: "pricebasket.in" },
      { hostname: "*.pricebasket.in" },
      { hostname: "logo.clearbit.com" },
      { hostname: "images.pexels.com" },
      { hostname: "picsum.photos" },
      { hostname: "assets.myntassets.com" },
      { hostname: "adn-static1.nykaa.com" },
      { hostname: "static-assets-web.flixcart.com" },
      { hostname: "images.unsplash.com" },
      { hostname: "upload.wikimedia.org" },
      { hostname: "play-lh.googleusercontent.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
