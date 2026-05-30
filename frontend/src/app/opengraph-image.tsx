import { ImageResponse } from "next/og";

// Site-wide default Open Graph / social-share image.
// Next.js auto-injects this for every route that doesn't define its own
// opengraph-image, with the correct absolute URL — replacing the previously
// referenced (and missing) /og-image.png.
export const runtime = "nodejs";
export const alt = "PriceBasket — Compare grocery prices across Blinkit, Zepto, BigBasket & more";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          padding: "70px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 14,
            background: "#ea580c",
          }}
        />

        {/* Logo / wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              fontSize: 54,
              width: 92,
              height: 92,
              background: "#ea580c",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🛒
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#ffffff" }}>
            PriceBasket
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            marginTop: 56,
            maxWidth: 1000,
          }}
        >
          Compare prices. Save up to 40%.
        </div>

        {/* Subline */}
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#fb923c",
            marginTop: 28,
            fontWeight: 600,
          }}
        >
          Blinkit · Zepto · BigBasket · Instamart · JioMart & more
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 60,
            left: 70,
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          pricebasket.in — India's quick-commerce price intelligence
        </div>
      </div>
    ),
    { ...size },
  );
}
