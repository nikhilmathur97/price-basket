import { NextRequest, NextResponse } from "next/server";

// Short aliases users might type directly in the address bar
const SHORT_ALIASES: Record<string, string> = {
  "/login":    "/auth/login",
  "/signin":   "/auth/login",
  "/signup":   "/auth/signup",
  "/register": "/auth/signup",
  "/logout":   "/",
};

// The real auth pages (after alias resolution)
const AUTH_PAGES = ["/auth/login", "/auth/signup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("pb_refresh_token");

  // 1. Short alias typed directly (e.g. /login, /signup)
  //    → logged-in users go home; guests go to the real auth page
  if (SHORT_ALIASES[pathname]) {
    const destination = hasSession ? "/" : SHORT_ALIASES[pathname];
    return NextResponse.redirect(new URL(destination, req.url));
  }

  // 2. Real auth pages (/auth/login, /auth/signup)
  //    → logged-in users go home
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match both the real auth pages and the short aliases
  matcher: [
    "/auth/login",
    "/auth/signup",
    "/login",
    "/signin",
    "/signup",
    "/register",
    "/logout",
  ],
};
