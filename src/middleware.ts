import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Coarse routing only. Middleware is NOT authorisation — every Server Action and
 * Route Handler re-checks with requireRole(). A middleware match proves nothing
 * about what the request is allowed to do.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await auth();
  const role = session?.user?.role;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!role) return NextResponse.redirect(new URL("/admin/login", req.url));
    if (role === "ARTIST") return NextResponse.redirect(new URL("/portal", req.url));
  }

  if (pathname.startsWith("/portal") && !pathname.startsWith("/portal/login") && !pathname.startsWith("/portal/invite")) {
    if (!role) return NextResponse.redirect(new URL("/portal/login", req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/admin/:path*", "/portal/:path*"] };
