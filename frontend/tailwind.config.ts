import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Swiggy-inspired warm orange palette
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",   // primary — deep warm orange
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        surface: {
          50:  "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "slide-up":     "slideUp 0.3s ease-out",
        "slide-down":   "slideDown 0.3s ease-out",
        "fade-in":      "fadeIn 0.2s ease-out",
        "pulse-slow":   "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        // Loader animations
        "cart-bounce":  "cartBounce 0.9s ease-in-out infinite",
        "float-tag":    "floatTag 2s ease-in-out infinite",
        "glow-pulse":   "glowPulse 2s ease-in-out infinite",
        "dot-bounce-1": "dotBounce 1.2s ease-in-out infinite 0ms",
        "dot-bounce-2": "dotBounce 1.2s ease-in-out infinite 150ms",
        "dot-bounce-3": "dotBounce 1.2s ease-in-out infinite 300ms",
        "dot-bounce-4": "dotBounce 1.2s ease-in-out infinite 450ms",
        "progress-bar": "progressBar 2s ease-in-out forwards",
        "ripple":       "ripple 1.8s ease-out infinite",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        cartBounce: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "40%":      { transform: "translateY(-12px) scale(1.08)" },
          "60%":      { transform: "translateY(-8px) scale(1.04)" },
        },
        floatTag: {
          "0%":   { opacity: "0", transform: "translateY(0) scale(0.8)" },
          "30%":  { opacity: "1", transform: "translateY(-14px) scale(1)" },
          "70%":  { opacity: "1", transform: "translateY(-22px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-32px) scale(0.9)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(12,131,31,0)" },
          "50%":      { boxShadow: "0 0 0 16px rgba(12,131,31,0.12)" },
        },
        dotBounce: {
          "0%, 80%, 100%": { transform: "scale(0.7)", opacity: "0.4" },
          "40%":           { transform: "scale(1.2)", opacity: "1" },
        },
        progressBar: {
          "0%":   { width: "0%" },
          "60%":  { width: "75%" },
          "100%": { width: "92%" },
        },
        ripple: {
          "0%":   { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      boxShadow: {
        card:  "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        hover: "0 4px 16px 0 rgb(0 0 0 / 0.12)",
        modal: "0 20px 60px -12px rgb(0 0 0 / 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
