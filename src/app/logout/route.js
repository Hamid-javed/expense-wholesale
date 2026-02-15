import { removeAuthCookie } from "../../lib/auth";
import { NextResponse } from "next/server";

function redirectToLogin(request) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export async function GET(request) {
  return redirectToLogin(request);
}

export async function POST(request) {
  await removeAuthCookie();
  return redirectToLogin(request);
}
