import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";

const SALT_ROUNDS = 10;
const TOKEN_COOKIE_NAME = "auth_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default-secret-change-in-production"
);
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  const h = await headers();
  const secure = h.get("x-forwarded-proto") === "https";
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(TOKEN_COOKIE_NAME);
  return cookie?.value ?? null;
}

export async function getSession() {
  const token = await getAuthToken();
  if (!token) return null;
  return verifyToken(token);
}

export { TOKEN_COOKIE_NAME };
