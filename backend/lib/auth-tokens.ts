import { SignJWT } from "jose";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-super-secret-key-change-me",
);

export interface TokenPayload {
  tenantId: string;
  userId: string;
  license_id: string;
  role_code: string;
}

// Generate a compact JWT valid for 8 hours
export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET_KEY);
}

// Secure HttpOnly configuration settings
export const AUTH_COOKIE_CONFIG: Omit<ResponseCookie, "name" | "value"> = {
  httpOnly: true, // Prevents client-side JavaScript from reading the token (XSS Protection)
  secure: process.env.NODE_ENV === "production", // Forces HTTPS in production
  sameSite: "lax", //strict", // Prevents CSRF by ensuring cookies are only sent on first-party requests
  path: "/",
  maxAge: 60 * 60 * 8,
};
