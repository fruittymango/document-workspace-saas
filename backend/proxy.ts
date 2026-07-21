import { NextResponse, NextRequest } from "next/server";
import { ratelimit } from "./lib/ratelimt";
import { validateUserJWT } from "./lib/api-guard";

const ALLOWED_ORIGINS = ["sandbox.payfast.co.za", process.env.APP_URL];
const NO_MEMBERS_ALLOWED = ["/billing", "/dashboard", "/users"];

export async function proxy(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
    const response = NextResponse.next();
    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept-Language",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true"); // Required for securing HttpOnly cookie streams

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    const path = request.nextUrl.pathname;
    if (
      path.startsWith("/_next") ||
      path.startsWith("/api/auth") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/signup") ||
      path.startsWith("/login") ||
      path.startsWith("/api/payfast/itn")
    ) {
      if (path.startsWith("/api")) {
        const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: "Too many requests. Please slow down." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            },
          );
        }
        response.headers.set("X-RateLimit-Limit", limit.toString());
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        response.headers.set("X-RateLimit-Reset", reset.toString());
      }
      return NextResponse.next();
    }

    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const { payload } = await validateUserJWT(token);
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    const isMember = (payload.role_code as string).toLowerCase() === "member";
    if (
      isMember &&
      NO_MEMBERS_ALLOWED.filter((path, index) =>
        request.nextUrl.pathname.startsWith(path),
      )?.length
    ) {
      return NextResponse.redirect(new URL("/documents", request.url));
    }
    return NextResponse.next();
  } catch (error) {
    console.log(error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/auth/logout|_next/static|_next/image|favicon.ico).*)",
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
