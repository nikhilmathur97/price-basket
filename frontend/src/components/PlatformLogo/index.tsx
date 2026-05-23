"use client";

import Image from "next/image";

// Local SVG logos served from /public/logos/ — no external dependencies
const LOCAL_LOGOS: Record<string, string> = {
  blinkit:   "/logos/blinkit.svg",
  zepto:     "/logos/zepto.svg",
  instamart: "/logos/instamart.svg",
  bigbasket: "/logos/bigbasket.svg",
  flipkart:  "/logos/flipkart.svg",
  amazon:    "/logos/amazon.svg",
  jiomart:   "/logos/jiomart.svg",
  dunzo:     "/logos/dunzo.svg",
  myntra:    "/logos/myntra.svg",
  nykaa:     "/logos/nykaa.svg",
};

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
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", width: size, height: size }}
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
