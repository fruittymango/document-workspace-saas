import { NextResponse } from "next/server";
import { SignupSchema } from "@/lib/schema";
import { addNewSignup } from "@/lib/services";
import { signAccessToken, AUTH_COOKIE_CONFIG } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/utils";

/**
 * Registers a brand-new firm and its first user as an owner, then signs them in. The new
 * tenant is created `unlicensed`, so the client should route the user into the
 * onboarding flow to purchase a license before accessing the workspace.
 */
export async function POST(request: Request) {
  try {
    const userUnknown = await request.json();
    const result = SignupSchema.safeParse(userUnknown);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 422 },
      );
    }
    const { name, surname, firmName, email, password } = result.data;
    const password_hash = hashPassword(password);
    const user = await addNewSignup(
      name,
      surname,
      firmName,
      email,
      password_hash,
    );
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create new user." },
        { status: 400 },
      );
    }
    const payload = {
      tenantId: user?.tenant_id,
      userId: user.id,
      license_id: user.license_id,
      role_code: user.role_code,
    };

    const token = await signAccessToken(payload);

    const response = NextResponse.json({
      user: {
        name: user.name,
        surname: user.surname,
        email: user.email,
        tenant: user?.tenant,
      },
      token: token,
    });

    response.cookies.set("session", token, AUTH_COOKIE_CONFIG);
    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal signup error" },
      { status: 500 },
    );
  }
}
