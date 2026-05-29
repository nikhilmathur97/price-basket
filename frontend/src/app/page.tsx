import Link from "next/link";
import Image from "next/image";
import { MOCK_CATEGORIES, MOCK_PLATFORMS } from "@/lib/mockData";
import { PlatformLogo } from "@/components/PlatformLogo";
import { HomeProductSections } from "@/components/HomeProductSections";
import { HeroCarousel } from "@/components/HeroCarousel";

// ── Category card colour accents ────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  "fruits-vegetables": { bg: "#FFF3E0", ring: "#FFCC80", text: "#E65100" },
  "dairy-breakfast":   { bg: "#E3F2FD", ring: "#90CAF9", text: "#1565C0" },
  "snacks-drinks":     { bg: "#F3E5F5", ring: "#CE93D8", text: "#6A1B9A" },
  "bakery":            { bg: "#FBE9E7", ring: "#FFAB91", text: "#BF360C" },
  "household":         { bg: "#E0F2F1", ring: "#80CBC4", text: "#00695C" },
  "personal-care":     { bg: "#FCE4EC", ring: "#F48FB1", text: "#880E4F" },
  "chicken-meat":      { bg: "#FFF8E1", ring: "#FFE082", text: "#F57F17" },
  "frozen-foods":      { bg: "#E8F5E9", ring: "#A5D6A7", text: "#2E7D32" },
  "baby-care":         { bg: "#F8BBD9", ring: "#F48FB1", text: "#880E4F" },
  "pet-care":          { bg: "#EFEBE9", ring: "#BCAAA4", text: "#4E342E" },
  "staples":           { bg: "#FFFDE7", ring: "#FFF176", text: "#F57F17" },
  "oils-spices":       { bg: "#FFF3E0", ring: "#FFCC80", text: "#BF360C" },
};

// ── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20 md:pb-8">

      {/* ── Hero carousel ── */}
      <HeroCarousel />

      <div className="max-w-screen-xl mx-auto px-4">

        {/* ── Platform logos strip ── */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {MOCK_PLATFORMS.map((p) => (
            <div key={p.slug}
              className="flex items-center gap-2 flex-shrink-0 bg-white rounded-xl
                         px-3 py-2 border border-surface-100 shadow-sm
                         hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="h-8 min-w-[2rem] max-w-[5rem] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center px-1"
                style={{ backgroundColor: (p.color_hex ?? "#e5e7eb") + "18", border: `1.5px solid ${p.color_hex ?? "#e5e7eb"}35` }}>
                <PlatformLogo slug={p.slug} name={p.name} colorHex={p.color_hex} size={22} />
              </div>
              <span className="text-[12px] font-semibold text-surface-700 whitespace-nowrap">{p.name}</span>
            </div>
          ))}
        </div>

        {/* ── Category grid ── */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
          {MOCK_CATEGORIES.map((cat) => {
            const colors = CAT_COLORS[cat.slug] ?? { bg: "#f5f5f5", ring: "#e0e0e0", text: "#525252" };
            return (
              <Link key={cat.slug} href={`/search?category=${cat.slug}`}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl group
                           hover:bg-white hover:shadow-md active:scale-[0.93]
                           transition-all duration-200 cursor-pointer">
                {/* Image or emoji tile */}
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden
                             flex items-center justify-center relative
                             group-hover:scale-110 group-hover:shadow-lg
                             transition-all duration-200"
                  style={{
                    backgroundColor: colors.bg,
                    boxShadow: `0 0 0 2px ${colors.ring}`,
                  }}
                >
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      sizes="64px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl select-none">{cat.icon}</span>
                  )}
                </div>
                <span
                  className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight
                             line-clamp-2 transition-colors duration-200"
                  style={{ color: colors.text }}
                >
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Product sections (fetches from API, falls back to mock) ── */}
        <HomeProductSections />

      </div>
    </div>
  );
}

