import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPlans, getTenantUsage } from "@/lib/billing";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Billing is restricted to admins.
  if (
    session.role_name.toLowerCase() !== "owner" &&
    session.role_name.toLowerCase() !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Scoped strictly to the caller's tenant.
  const billing = await getTenantUsage(session.tenant_id);
  if (!billing) {
    return NextResponse.json({ error: "Billing not found." }, { status: 404 });
  }
  const plans = await getPlans();
  return NextResponse.json({ billing, plans });
}
