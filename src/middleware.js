import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default-secret-change-in-production"
);
const AUTH_COOKIE = "auth_token";

const publicPaths = ["/login"];

function isPublicPath(pathname) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (isPublic) {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      } catch {
        // invalid token, allow access to login
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0");
    return res;
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete(AUTH_COOKIE);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/invoices).*)",
  ],
};
