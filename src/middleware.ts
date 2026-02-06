import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdomain routing: admin.yourdomain.com -> /admin
 * This lets User and Admin run on separate origins = separate Firebase sessions.
 * No more "stuck" when logged in as both at the same time.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // admin subdomain (e.g. admin.easyadz.lk) or admin.localhost
  const isAdminSubdomain =
    host.startsWith("admin.") || host === "admin" || host.startsWith("admin:");

  if (isAdminSubdomain && !url.pathname.startsWith("/admin")) {
    url.pathname = url.pathname === "/" ? "/admin" : `/admin${url.pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
