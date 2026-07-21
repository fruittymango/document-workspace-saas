import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPlans } from "@/lib/billing";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (
    session.role_code.toLowerCase() !== "owner" &&
    session.role_code.toLowerCase() !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const plans = await getPlans();
  return NextResponse.json({ plans });
}
