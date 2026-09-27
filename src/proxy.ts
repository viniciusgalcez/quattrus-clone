import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  // Decode the signed JWT locally. Calling `auth()` here also runs the
  // session callback, which would query PostgreSQL once in the proxy and then
  // again while rendering the page. Pages and Server Actions still refresh
  // active/role/permissions from the database before using protected data.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });
  const isLoggedIn = !!token;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (isLoggedIn && req.nextUrl.pathname === "/inicio") {
    const startPage = typeof token.startPage === "string" && ["/", "/metas", "/farol", "/agenda"].includes(token.startPage)
      ? token.startPage
      : "/";
    return NextResponse.redirect(new URL(startPage, req.nextUrl.origin));
  }

  // Keep /login reachable. If an administrator deactivates an account, the
  // fresh page-level validation sends it here; redirecting from a stale JWT
  // would otherwise create a /login <-> /inicio loop.
  return NextResponse.next();
}

export const config = {
  // `api/health` must stay public: the container healthcheck would otherwise
  // get a 307 to /login and the service would never report healthy. Public
  // image assets also need to bypass auth so Next Image can optimize them.
  matcher: [
    "/((?!api/auth|api/health|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
