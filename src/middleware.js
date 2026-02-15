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

const DEBUG_INGEST =
  "http://127.0.0.1:7243/ingest/245714b1-41f2-4af8-8825-7ab304daec9b";

function log(location, message, data, hypothesisId) {
  fetch(DEBUG_INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const hasToken = !!token;

  // #region agent log
  log("src/middleware.js:entry", "middleware run", { pathname, isPublic, hasToken }, "H1");
  // #endregion

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
    // #region agent log
    log("src/middleware.js:redirect", "redirect to login (no token)", { pathname }, "H2");
    // #endregion
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    // #region agent log
    log("src/middleware.js:allow", "allow (valid token)", { pathname }, "H3");
    // #endregion
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0");
    return res;
  } catch {
    // #region agent log
    log("src/middleware.js:redirect", "redirect to login (invalid token)", { pathname }, "H2");
    // #endregion
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
