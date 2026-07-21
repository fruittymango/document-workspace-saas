import { NextResponse } from "next/server";
import { AuthSchema } from "@/lib/schema";
import { findUserByEmail } from "@/lib/services";
import { signAccessToken, AUTH_COOKIE_CONFIG } from "@/lib/auth-tokens";
import { verifyPassword } from "@/lib/utils";

/**
 * Uses email and password to create a an access token for users.
 * Although, we return the user their token we provide the flexibility
 * of allowing them to still connect without explicity supplying us with
 * a token in the header. We do this using the httpOnly cookie.
 */
export async function POST(request: Request) {
  try {
    const userUnknown = await request.json();
    const result = AuthSchema.safeParse(userUnknown);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 422 },
      );
    }
    const { email, password } = result.data;
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, (await user).password_hash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
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
      { error: "Internal authentication error" },
      { status: 500 },
    );
  }
}
