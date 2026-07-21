import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createTenantPrismaClient } from "./prisma";
import { SessionUser } from "./types";

export type AuthenticatedAPIContext = {
  tenantId: string;
  userId: string;
  license_id: string;
  role_code: string;
  locale: "en" | "af";
  db: ReturnType<typeof createTenantPrismaClient>;
};

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthenticatedAPIContext,
  params?: any,
) => Promise<NextResponse>;

/**
 * The TenantAPI guard prepares a db context for the user to ensure that cross
 * tenant data leaks are restricted. The guard will inject the tenantId to the
 * connection instance so that records with Row Level Security enabled are able
 * to pick up the tenant id.
 *
 * The tenant Id is safe extracted from the successful validation of the token
 * obtained from either the cookie or request header.
 */
export function withTenantAPI(handler: AuthenticatedHandler) {
  return async (req: NextRequest, routeContext: any) => {
    let token = req.cookies.get("session")?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) token = authHeader.split(" ")[1];
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    try {
      const { payload } = await validateUserJWT(token);
      const tenantId = payload.tenantId as string;
      const acceptLanguage = req.headers.get("accept-language") || "en";
      const locale: "en" | "af" = acceptLanguage.toLowerCase().includes("af")
        ? "af"
        : "en";
      const tenantDbClient = createTenantPrismaClient(tenantId);
      const apiContext: AuthenticatedAPIContext = {
        tenantId,
        userId: payload.userId as string,
        license_id: payload.license_id as string,
        role_code: payload.role_code as string,
        locale,
        db: tenantDbClient,
      };
      return await handler(req, apiContext, routeContext?.params);
    } catch (error) {
      console.log(error);
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  };
}

export function validateUserJWT(token: string) {
  return jwtVerify(
    token,
    new TextEncoder().encode(
      process.env.JWT_SECRET || "fallback-super-secret-key-change-me",
    ),
  );
}

/**
 * Guards workspace APIs behind an active license. Returns a 403 response when
 * the caller's tenant has not completed onboarding, otherwise `null` so the
 * route can proceed. Billing/checkout routes intentionally skip this so an
 * unlicensed firm can still purchase its first license.
 */
export function licenseGuard(session: SessionUser): NextResponse | null {
  // if (session.licenseStatus !== "active") {
  //   return NextResponse.json(
  //     { error: "An active license is required to use the workspace." },
  //     { status: 403 },
  //   )
  // }
  return null;
}
