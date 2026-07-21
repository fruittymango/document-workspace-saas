import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createTenantPrismaClient } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const tenantDbClient = createTenantPrismaClient(session.tenant_id);

  const statuses = await tenantDbClient.documentStatus.findMany();
  return NextResponse.json({ statuses });
}
