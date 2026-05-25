import { NextRequest, NextResponse } from "next/server";

const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept auth pages
  if (!AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // If the refresh-token cookie is present the user has an active session.
  // Redirect them to home — no need to show the login/signup form.
  const hasSession = req.cookies.has("pb_refresh_token");
  if (hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/login", "/auth/signup"],
};
