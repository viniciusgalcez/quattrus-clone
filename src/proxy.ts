import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  // A deactivated account: the session callback already re-reads `active`
  // from the DB on every request, so this takes effect on the very next
  // navigation — no need to wait for the JWT to expire.
  if (isLoggedIn && req.auth?.user.active === false && !isLoginPage) {
    return NextResponse.redirect(new URL("/login?error=inactive", req.nextUrl.origin));
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (isLoggedIn && isLoginPage && req.auth?.user.active !== false) {
    return NextResponse.redirect(new URL("/inicio", req.nextUrl.origin));
  }
});

export const config = {
  // `api/health` must stay public: the container healthcheck would otherwise
  // get a 307 to /login and the service would never report healthy.
  matcher: ["/((?!api/auth|api/health|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
