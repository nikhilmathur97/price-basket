"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Chip = { icon: string; text: string };

type Slide = {
  id: string;
  bg: string;
  ctaColor: string;
  tag: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  chips: Chip[];
  image?: string;
  bigEmoji?: string;
};

const SLIDES: Slide[] = [
  {
    id: "hero",
    bg: "#FC5A01",
    ctaColor: "#FC5A01",
    tag: "🛒 10 Platforms",
    title: "Compare grocery prices.\nSave every time.",
    subtitle: "Blinkit · Zepto · Instamart · Flipkart · Amazon & more",
    cta: { label: "Start comparing →", href: "/search" },
    chips: [
      { icon: "⚡", text: "10-min delivery" },
      { icon: "🏪", text: "10 platforms" },
      { icon: "💰", text: "Save up to 40%" },
    ],
    image: "/hero-basket.png",
  },
  {
    id: "vegetables",
    bg: "linear-gradient(135deg, #16a34a 0%, #14532d 100%)",
    ctaColor: "#16a34a",
    tag: "🥦 Today's Deals",
    title: "Fresh Vegetables\nUp to 40% cheaper",
    subtitle: "Compare Blinkit, BigBasket, Zepto & get the freshest price",
    cta: { label: "Shop Vegetables →", href: "/search?category=fruits-vegetables" },
    chips: [
      { icon: "🌿", text: "Farm fresh" },
      { icon: "💸", text: "Lowest price" },
      { icon: "🔄", text: "Live compare" },
    ],
    bigEmoji: "🥦",
  },
  {
    id: "dairy",
    bg: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)",
    ctaColor: "#2563eb",
    tag: "🥛 Dairy & Eggs",
    title: "Milk, Eggs & more\nat the best price",
    subtitle: "Who's cheapest today — Blinkit, Zepto or BigBasket?",
    cta: { label: "Compare Dairy →", href: "/search?category=dairy-breakfast" },
    chips: [
      { icon: "🥛", text: "Daily fresh" },
      { icon: "📉", text: "Price alerts" },
      { icon: "🚚", text: "Quick delivery" },
    ],
    bigEmoji: "🥛",
  },
  {
    id: "snacks",
    bg: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
    ctaColor: "#7c3aed",
    tag: "🍪 Snacks & Drinks",
    title: "Never overpay\nfor snacks again",
    subtitle: "Compare chips, drinks, biscuits & beverages in one tap",
    cta: { label: "Find Best Price →", href: "/search?category=snacks-drinks" },
    chips: [
      { icon: "🔍", text: "Instant compare" },
      { icon: "📉", text: "Save more" },
      { icon: "🎯", text: "Best deals" },
    ],
    bigEmoji: "🍪",
  },
  {
    id: "staples",
    bg: "linear-gradient(135deg, #d97706 0%, #78350f 100%)",
    ctaColor: "#d97706",
    tag: "🌾 Kitchen Essentials",
    title: "Rice, Dal, Oil & Atta\nat unbeatable prices",
    subtitle: "Track everyday staples & get alerts when prices drop",
    cta: { label: "Shop Staples →", href: "/search?category=staples" },
    chips: [
      { icon: "📦", text: "Bulk savings" },
      { icon: "🔔", text: "Price alerts" },
      { icon: "🏆", text: "Best brands" },
    ],
    bigEmoji: "🌾",
  },
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length, -1);
  }, [current, goTo]);

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length, 1);
  }, [current, goTo]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [paused, next]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
    touchStartX.current = null;
    setPaused(false);
  }

  const slide = SLIDES[current];

  return (
    <div className="px-3 pt-2 pb-2">
      <div className="max-w-screen-xl mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl shadow-lg h-[240px] sm:h-[245px] md:h-[265px] lg:h-[285px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ contain: "layout", touchAction: "pan-y" }}
        >
          <AnimatePresence custom={direction} initial={false}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.38 }}
              className="absolute inset-0 flex items-center gap-3 px-5 py-4 md:px-8 md:py-5"
              style={{ background: slide.bg, willChange: "transform" }}
            >
              <>

                  <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
                  <div className="absolute -bottom-10 -left-8 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />
                  <div className="absolute top-0 right-1/3 w-24 h-24 bg-white/[0.03] rounded-full pointer-events-none" />

                  <div className={`flex-1 min-w-0 z-10 ${
                    slide.image
                      ? "pr-[130px] sm:pr-[158px] md:pr-[175px] lg:pr-[200px]"
                      : ""
                  }`}>
                    <div className="inline-flex items-center gap-1 bg-white/20 text-white
                                    text-[10px] font-bold px-2.5 py-1 rounded-full mb-2
                                    border border-white/25 backdrop-blur-sm">
                      {slide.tag}
                    </div>
                    <h2 className="text-[19px] sm:text-[26px] md:text-[30px] lg:text-[34px]
                                   font-black text-white leading-tight tracking-tight whitespace-pre-line">
                      {slide.title}
                    </h2>
                    <p className="text-white/75 text-[11px] sm:text-[12px] md:text-[13px]
                                  font-medium mt-1 mb-3 leading-snug line-clamp-2">
                      {slide.subtitle}
                    </p>
                    <Link
                      href={slide.cta.href}
                      className="inline-flex items-center gap-1 bg-white text-[11px] sm:text-[12px]
                                 font-bold rounded-xl px-3.5 py-2 shadow-md mb-3
                                 hover:scale-105 active:scale-95 transition-transform duration-150"
                      style={{ color: slide.ctaColor }}
                    >
                      {slide.cta.label}
                    </Link>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                      {slide.chips.map((chip) => (
                        <div
                          key={chip.text}
                          className="flex items-center gap-1 flex-shrink-0 bg-white/15 backdrop-blur-sm
                                     text-white text-[10px] font-semibold px-2.5 py-1.5
                                     rounded-full border border-white/20"
                        >
                          <span>{chip.icon}</span>
                          <span>{chip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!slide.image && (
                    <div className="flex-shrink-0 self-center z-10">
                      <div className="w-[80px] h-[80px] sm:w-[108px] sm:h-[108px]
                                      md:w-[130px] md:h-[130px] lg:w-[150px] lg:h-[150px]
                                      rounded-full bg-white/15 backdrop-blur-sm border border-white/25
                                      flex items-center justify-center shadow-inner">
                        <span className="text-[42px] sm:text-[58px] md:text-[68px] lg:text-[78px] select-none leading-none">
                          {slide.bigEmoji}
                        </span>
                      </div>
                    </div>
                  )}

                  {slide.image && (
                    <div className="absolute right-0 inset-y-0
                                    w-[130px] sm:w-[158px] md:w-[175px] lg:w-[200px]
                                    z-10 pointer-events-none">
                      <Image
                        src={slide.image}
                        alt="Grocery basket"
                        fill
                        sizes="(max-width: 640px) 130px, (max-width: 768px) 158px, (max-width: 1024px) 175px, 200px"
                        className="object-contain object-center"
                        priority
                      />
                      <div
                        className="absolute inset-y-0 left-0 w-10 pointer-events-none"
                        style={{ background: `linear-gradient(to right, ${slide.bg}, transparent)` }}
                      />
                    </div>
                  )}
              </>
            </motion.div>
          </AnimatePresence>

          {/* ── Left arrow (md+) ── */}
          <button
            onClick={prev}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20
                       w-8 h-8 rounded-full bg-black/20 hover:bg-black/35
                       items-center justify-center text-white
                       transition-colors duration-150 backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* ── Right arrow (md+) ── */}
          <button
            onClick={next}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20
                       w-8 h-8 rounded-full bg-black/20 hover:bg-black/35
                       items-center justify-center text-white
                       transition-colors duration-150 backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* ── Dot / pill indicators ── */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i, i > current ? 1 : -1)}
                className={`rounded-full transition-all duration-300 ease-in-out ${
                  i === current
                    ? "w-5 h-[6px] bg-white"
                    : "w-[6px] h-[6px] bg-white/45 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
