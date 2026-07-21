"use server";

import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";
import { findUserById } from "./services";

const SESSION_COOKIE = "session";
const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Resolves the currently authenticated user from the session cookie.
 * Returns `null` when there is no valid session.
 */
export async function getSessionUser(): Promise<SessionUser | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    const user = await findUserById(payload.userId as string);
    if (!user) {
      return;
    }
    return user;
  } catch (err) {
    console.log(err);
  }
}
