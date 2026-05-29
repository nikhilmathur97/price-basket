"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isCart?: boolean;
}> = [
  { href: "/",        icon: Home,         label: "Home"   },
  { href: "/search",  icon: Search,       label: "Search" },
  { href: "/cart",    icon: ShoppingCart, label: "Cart",  isCart: true },
  { href: "/profile", icon: User,         label: "Me"     },
];

export function BottomNav() {
  const pathname = usePathname();
  const { totalItems, openCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // Hide on auth and admin pages
  if (
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  // Hide when running inside the Flutter WebView shell.
  // Detected via custom User-Agent OR ?source=app query param.
  if (typeof window !== "undefined") {
    const isFlutterApp =
      window.navigator.userAgent.includes("PriceBasketApp") ||
      new URLSearchParams(window.location.search).get("source") === "app";
    if (isFlutterApp) return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden
                 bg-white border-t border-surface-100
                 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[58px]">
        {NAV_ITEMS.map(({ href, icon: Icon, label, isCart }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          const showBadge = isCart && isAuthenticated && totalItems > 0;

          function handleClick() {
            if (isCart && isAuthenticated) {
              openCart();
            }
          }

          const Wrapper = isCart && isAuthenticated ? "button" : Link;
          const wrapperProps = isCart && isAuthenticated
            ? { onClick: handleClick }
            : { href };

          return (
            <Wrapper
              key={href}
              {...(wrapperProps as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-[3px]",
                "relative transition-colors active:bg-surface-50 select-none",
                isActive ? "text-brand-600" : "text-surface-400"
              )}
            >
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2
                             w-8 h-[2px] bg-brand-600 rounded-b-full"
                />
              )}

              {/* Icon */}
              <div className="relative">
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all",
                    isActive ? "stroke-[2.5]" : "stroke-[1.8]"
                  )}
                />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white
                               text-[9px] font-extrabold min-w-[16px] h-[16px] px-0.5
                               rounded-full flex items-center justify-center leading-none"
                  >
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] leading-none font-medium",
                  isActive && "font-bold"
                )}
              >
                {label}
              </span>
            </Wrapper>
          );
        })}
      </div>
    </nav>
  );
}
