/** @type {import('next').NextConfig} */

// ── Security + SEO headers ────────────────────────────────────────────────────
const SECURITY_HEADERS = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Force HTTPS
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Referrer policy — send full URL to same origin, origin only cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions policy — disable unused browser APIs
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
  // XSS protection (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig = {
  images: {
    // Next.js serves AVIF → WebP → original. Fixes the 2.5 MB image payload & mobile LCP.
    // Vercel Hobby: 1,000 optimizations/month free; upgrade plan if traffic grows.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
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
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      {
        // Block indexing of admin/api/auth routes
        source: "/(admin|api|auth|profile|orders)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    return [
      // www → non-www canonical redirect
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pricebasket.in" }],
        destination: "https://pricebasket.in/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // API_URL is set in Vercel env vars → AWS ALB DNS.
    // Falls back to localhost:8001 for local dev.
    const backendUrl =
      process.env.API_URL ??
      process.env.BACKEND_URL ??
      "http://localhost:8001";
    return [
      {
        // Proxy all /api/* calls server-side through Next.js → AWS ALB.
        // The browser never sees the ALB URL — all calls go via Vercel edge.
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

module.exports = nextConfig;
