"use client";

import { SearchBar } from "@/components/SearchBar";
import { Zap, CheckCircle2, TrendingDown } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800
                        rounded-3xl px-6 py-10 sm:py-14 mt-6">
      {/* Background circles */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />

      <div className="relative max-w-2xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold
                        px-3 py-1.5 rounded-full mb-5 border border-white/20">
          <Zap className="w-3.5 h-3.5 fill-white" />
          Real-time prices across all platforms
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
          Compare grocery prices.<br />
          <span className="text-brand-200">Save every time.</span>
        </h1>
        <p className="text-white/80 text-sm sm:text-base mb-8">
          Search any product and instantly see prices from Blinkit, Zepto, BigBasket &amp; Swiggy Instamart.
        </p>

        {/* Search bar */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-1.5">
            <SearchBar autoFocus />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-6 mt-8 text-white/80 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand-200" />
            4 platforms
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-brand-200" />
            Save up to 40%
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-brand-200 fill-brand-200" />
            Real-time prices
          </div>
        </div>
      </div>
    </section>
  );
}
