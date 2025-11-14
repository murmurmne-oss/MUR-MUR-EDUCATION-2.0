import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  buildAllowedSessionTokens,
  getEnabledAuthModes,
  loadAdminAuthConfig,
} from "@/lib/admin-auth-config";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const config = loadAdminAuthConfig();
  const { pathname, search } = request.nextUrl;

  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets");

  if (isStaticAsset) {
    return NextResponse.next();
  }

  const availableModes = getEnabledAuthModes(config);

  const requiresAuth = !(PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  ) || pathname === "/login");

  if (!config || availableModes.length === 0) {
    if (requiresAuth) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/login") {
        loginUrl.searchParams.set(
          "redirect",
          pathname + (search ? search : ""),
        );
      }
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  const allowedTokens = await buildAllowedSessionTokens(config);
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const isAuthenticated =
    sessionCookie.length > 0 && allowedTokens.includes(sessionCookie);

  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth/logout")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const redirectPath = pathname + (search ? search : "");
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
