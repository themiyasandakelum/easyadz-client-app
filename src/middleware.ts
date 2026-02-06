import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin routing: admin.yourdomain.com or admin-*.vercel.app -> /admin
 * Separate deployments = separate Firebase sessions (no "stuck" when logged in as both).
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // Admin: subdomain (admin.easyadz.lk), admin-*.vercel.app, or NEXT_PUBLIC_IS_ADMIN
  const isAdminDeployment =
    process.env.NEXT_PUBLIC_IS_ADMIN === "true" ||
    host.startsWith("admin.") ||
    host.startsWith("admin-") ||
    host === "admin" ||
    host.startsWith("admin:");

  if (isAdminDeployment && !url.pathname.startsWith("/admin")) {
    // Sign-in/sign-up: admin has no register page, always use /admin/signin
    if (url.pathname === "/signin" || url.pathname === "/register" || url.pathname === "/signup") {
      url.pathname = "/admin/signin";
      return NextResponse.redirect(url);
    }
    url.pathname = url.pathname === "/" ? "/admin" : `/admin${url.pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
