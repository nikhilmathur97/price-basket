"use client";

import Image from "next/image";

// Real logos downloaded from official CDNs and Wikipedia/Wikimedia Commons
const LOCAL_LOGOS: Record<string, string> = {
  blinkit:   "/logos/blinkit.svg",   // 3500×3500 square app icon (Wikimedia Commons)
  zepto:     "/logos/zepto.svg",     // 90×30 wide wordmark
  instamart: "/logos/instamart.png", // 192×192 square app icon (Swiggy CDN)
  bigbasket: "/logos/bigbasket.svg", // 91×34 wide wordmark (en.wikipedia)
  flipkart:  "/logos/flipkart.svg",  // wide vector logo (en.wikipedia)
  amazon:    "/logos/amazon.svg",    // wide wordmark (Wikimedia Commons)
  jiomart:   "/logos/jiomart.svg",   // 384×384 square logo (en.wikipedia)
  dunzo:     "/logos/dunzo.svg",     // wide wordmark (en.wikipedia)
  myntra:    "/logos/myntra.png",    // 180×180 square app icon (myntra.com)
  nykaa:     "/logos/nykaa.svg",     // wide wordmark (en.wikipedia)
};

// Logos that are wide wordmarks — rendered at fixed height, auto width
const WIDE_LOGOS = new Set(["zepto", "bigbasket", "flipkart", "amazon", "dunzo", "nykaa"]);

// Brand colors for the text-initial fallback (only shown if slug is unknown)
const BRAND_COLORS: Record<string, string> = {
  blinkit:   "#F8C300",
  zepto:     "#6D3FD8",
  instamart: "#FC8019",
  bigbasket: "#84C225",
  flipkart:  "#2874F0",
  amazon:    "#FF9900",
  jiomart:   "#0057A8",
  dunzo:     "#00D290",
  myntra:    "#FF3366",
  nykaa:     "#FC2779",
};

interface PlatformLogoProps {
  slug: string;
  name: string;
  colorHex?: string | null;
  size?: number;
  className?: string;
}

export function PlatformLogo({
  slug,
  name,
  colorHex,
  size = 28,
  className = "",
}: PlatformLogoProps) {
  const src = LOCAL_LOGOS[slug];

  if (src) {
    if (WIDE_LOGOS.has(slug)) {
      // Wide wordmark logos: render at full height, let width be natural
      // Parent container must have overflow:hidden or min-width to fit
      return (
        <Image
          src={src}
          alt={name}
          width={size * 4}
          height={size}
          className={className}
          style={{ objectFit: "contain", height: size, width: "auto", maxWidth: size * 4 }}
          unoptimized={src.endsWith(".svg")}
        />
      );
    }

    // Square logos: render at size × size
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", width: size, height: size }}
        unoptimized={src.endsWith(".svg")}
      />
    );
  }

  // Unknown platform — render a branded initial badge
  const color = colorHex ?? BRAND_COLORS[slug] ?? "#6b7280";
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className={`flex items-center justify-center font-black select-none rounded-lg ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: color + "22",
        color,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}
