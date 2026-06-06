import { NextRequest, NextResponse } from "next/server";

// Short aliases users might type directly in the address bar
const SHORT_ALIASES: Record<string, string> = {
  "/login":    "/auth/login",
  "/signin":   "/auth/login",
  "/signup":   "/auth/signup",
  "/register": "/auth/signup",
  "/logout":   "/",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Short alias typed directly (e.g. /login, /signup)
  // → always redirect to the real auth page regardless of session state.
  // Do NOT redirect logged-in users to "/" here — the cookie presence check
  // is unreliable (expired/stale cookies still redirect users away from login,
  // making it impossible to access the login page even when not authenticated).
  // The client-side login page useEffect handles redirect for authenticated users
  // after properly validating the session via api.me().
  if (SHORT_ALIASES[pathname]) {
    return NextResponse.redirect(new URL(SHORT_ALIASES[pathname], req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match only the short aliases — real auth pages no longer need middleware
  matcher: [
    "/login",
    "/signin",
    "/signup",
    "/register",
    "/logout",
  ],
};
