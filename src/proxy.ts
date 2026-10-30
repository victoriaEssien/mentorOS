import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route guard: redirects to sign-in when there is no session cookie.
 * This only checks that a cookie exists. Real authorization happens on the server
 * (getSession in layouts, actions and route handlers), never here alone.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/today/:path*",
    "/onboarding/:path*",
    "/concepts/:path*",
    "/profile/:path*",
    "/projects/:path*",
    "/mentor/:path*",
    "/settings/:path*",
  ],
};
