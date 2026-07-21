import { NextResponse } from "next/server";
import { AUTH_COOKIE_CONFIG } from "@/lib/auth-tokens";

/**
 * Users are signed out by destroying the httpOnly cookie
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "", AUTH_COOKIE_CONFIG);
  return response;
}
