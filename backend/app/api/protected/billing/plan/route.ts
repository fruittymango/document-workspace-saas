import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLicensePlan } from "@/lib/billing";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (
    session.role_name.toLowerCase() !== "owner" &&
    session.role_name.toLowerCase() !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const licensePlan = await getLicensePlan(session.tenant_id);
  return NextResponse.json({ licensePlan });
}
