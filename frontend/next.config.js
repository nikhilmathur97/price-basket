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
  // ── SWC minifier (default in Next 13+, explicit for clarity) ─────────────
  // Faster than Terser and produces smaller output. Eliminates dead code from
  // tree-shaken modules (e.g. framer-motion sub-paths not used after ProductCard
  // migration to CSS transitions).
  swcMinify: true,

  images: {
    // Next.js serves AVIF → WebP → original. Fixes the 2.5 MB image payload & mobile LCP.
    // Vercel Hobby: 1,000 optimizations/month free; upgrade plan if traffic grows.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // 96 and 128 cover the 132×132 product card thumbnails exactly.
    // Next.js picks the smallest size ≥ the requested width, so a 132px card
    // served at 2× DPR (264px) will get the 384px bucket — a 1000×1000 PNG
    // becomes a ~15 KB WebP instead of ~1.5 MB.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 86400 s = 24 h. Lighthouse flags cdn.grofers.com images at 30 min TTL as
    // "Use efficient cache lifetimes". Product images rarely change intra-day;
    // 24 h cache eliminates repeat-visit re-downloads (saves ~10 MB per return visit).
    minimumCacheTTL: 86400,
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

  // NOTE: rewrites() for /api/* have been intentionally removed.
  // The catch-all route handler at src/app/api/v1/[...path]/route.ts
  // already proxies all /api/v1/* requests to the backend with:
  //   - Retry logic (auth endpoints get 2 attempts)
  //   - Structured 503 JSON fallback (never raw network errors)
  //   - Proper Cache-Control passthrough for Vercel CDN edge caching
  // Adding a rewrites() entry for /api/* would bypass that handler,
  // losing all retry/fallback/cache logic and causing data to silently
  // fail to load in the app.

  experimental: {
    // Tree-shake lucide-react and recharts — only import the icons/components
    // actually used, not the entire library. Saves ~40 KB of JS per page.
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
    // Inline critical CSS and defer non-critical stylesheets — removes the two
    // render-blocking CSS chunks flagged by Lighthouse (fa74839a…css, 3add334e…css).
    // critters extracts above-the-fold CSS and inlines it; the rest loads async.
    optimizeCss: true,
  },

  // ── Webpack: split framer-motion into its own async chunk ─────────────────
  // framer-motion is only used in HeroCarousel (already dynamic-imported) and
  // was previously in ProductCard (now removed). Isolating it in a named chunk
  // prevents it from being bundled into the main JS payload and ensures it is
  // only downloaded when the carousel actually renders.
  webpack(config, { isServer }) {
    if (!isServer) {
      config.optimization = config.optimization ?? {};
      config.optimization.splitChunks = config.optimization.splitChunks ?? {};
      const existing = config.optimization.splitChunks.cacheGroups ?? {};
      config.optimization.splitChunks.cacheGroups = {
        ...existing,
        // Isolate framer-motion so it never lands in the initial JS bundle
        framerMotion: {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: "framer-motion",
          chunks: "async",
          priority: 30,
          enforce: true,
        },
        // Keep recharts (admin charts) out of the main bundle
        recharts: {
          test: /[\\/]node_modules[\\/]recharts[\\/]/,
          name: "recharts",
          chunks: "async",
          priority: 25,
          enforce: true,
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
