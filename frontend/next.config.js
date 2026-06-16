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
      { protocol: "https", hostname: "cdn.blinkit.com" },
      { protocol: "https", hostname: "assets.blinkit.com" },
      { protocol: "https", hostname: "cdn.grofers.com" },
      { protocol: "https", hostname: "grofers.com" },
      // Zepto — multiple subdomains used in production
      { protocol: "https", hostname: "cdn.zeptonow.com" },
      { protocol: "https", hostname: "**.zeptonow.com" },
      // BigBasket — S3 bucket + direct CDN
      { protocol: "https", hostname: "www.bigbasket.com" },
      { protocol: "https", hostname: "bb-website-live.s3.amazonaws.com" },
      { protocol: "https", hostname: "bb-website-live.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "*.bigbasket.com" },
      // Swiggy Instamart — multiple CDN subdomains
      { protocol: "https", hostname: "media-assets.swiggy.com" },
      { protocol: "https", hostname: "**.swiggy.com" },
      // Cloudinary (used by Swiggy/Instamart and others)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // JioMart
      { protocol: "https", hostname: "www.jiomart.com" },
      { protocol: "https", hostname: "**.jiomart.com" },
      // Amazon — multiple image CDN subdomains
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      // Flipkart — both rukminim1 and rukminim2 are used
      { protocol: "https", hostname: "static-assets-web.flixcart.com" },
      { protocol: "https", hostname: "rukminim1.fliximg.com" },
      { protocol: "https", hostname: "rukminim2.fliximg.com" },
      { protocol: "https", hostname: "**.fliximg.com" },
      { protocol: "https", hostname: "**.flixcart.com" },
      // Myntra / Nykaa
      { protocol: "https", hostname: "assets.myntassets.com" },
      { protocol: "https", hostname: "**.myntassets.com" },
      { protocol: "https", hostname: "adn-static1.nykaa.com" },
      { protocol: "https", hostname: "**.nykaa.com" },
      // PriceBasket assets
      { protocol: "https", hostname: "pricebasket-assets.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "pricebasket-assets.s3.amazonaws.com" },
      { protocol: "https", hostname: "test.pricebasket.in" },
      { protocol: "https", hostname: "pricebasket.in" },
      // Generic AWS S3 (scraped product images often hosted on S3)
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
      { protocol: "https", hostname: "**.s3.ap-south-1.amazonaws.com" },
      // Generic / fallback
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "play-lh.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "ui-avatars.com" },
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
