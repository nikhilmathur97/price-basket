"use client";

import { useState } from "react";

// Reliable logo URLs per platform slug — tried in order until one loads
const LOGO_SOURCES: Record<string, string[]> = {
  blinkit:   [
    "https://blinkit.com/apple-touch-icon.png",
    "https://logo.clearbit.com/blinkit.com",
    "https://www.google.com/s2/favicons?domain=blinkit.com&sz=64",
  ],
  zepto:     [
    "https://cdn.zeptonow.com/production/assets/images/pdp/zepto-logo.svg",
    "https://logo.clearbit.com/zeptonow.com",
    "https://www.google.com/s2/favicons?domain=zeptonow.com&sz=64",
  ],
  instamart: [
    "https://logo.clearbit.com/swiggy.com",
    "https://www.google.com/s2/favicons?domain=swiggy.com&sz=64",
  ],
  bigbasket: [
    "https://logo.clearbit.com/bigbasket.com",
    "https://www.google.com/s2/favicons?domain=bigbasket.com&sz=64",
  ],
  flipkart:  [
    "https://logo.clearbit.com/flipkart.com",
    "https://www.google.com/s2/favicons?domain=flipkart.com&sz=64",
  ],
  amazon:    [
    "https://logo.clearbit.com/amazon.com",
    "https://www.google.com/s2/favicons?domain=amazon.com&sz=64",
  ],
  jiomart:   [
    "https://logo.clearbit.com/jiomart.com",
    "https://www.google.com/s2/favicons?domain=jiomart.com&sz=64",
  ],
  dunzo:     [
    "https://logo.clearbit.com/dunzo.com",
    "https://www.google.com/s2/favicons?domain=dunzo.com&sz=64",
  ],
  myntra:    [
    "https://logo.clearbit.com/myntra.com",
    "https://www.google.com/s2/favicons?domain=myntra.com&sz=64",
  ],
  nykaa:     [
    "https://logo.clearbit.com/nykaa.com",
    "https://www.google.com/s2/favicons?domain=nykaa.com&sz=64",
  ],
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
  const sources = LOGO_SOURCES[slug] ?? [];
  const [idx, setIdx] = useState(0);

  if (idx < sources.length) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sources[idx]}
        alt={name}
        width={size}
        height={size}
        onError={() => setIdx((i) => i + 1)}
        className={className}
        style={{ objectFit: "contain", width: size, height: size }}
      />
    );
  }

  // All sources failed — render a professional initial badge
  const color = colorHex ?? "#6b7280";
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className={`flex items-center justify-center font-black select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        color,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}
