import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canTransition, STATUS_LABELS } from "@/lib/status";
import { createTenantPrismaClient } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { statusId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dbContext = await createTenantPrismaClient(session.tenant_id);

  const doc = await dbContext.document.findFirst({
    where: {
      id,
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  // if (!canTransition(doc.status, body.status)) {
  //   return NextResponse.json(
  //     {
  //       error: `Cannot move from "${STATUS_LABELS[doc.status]}" to "${STATUS_LABELS[status as unknown as DocumentStatus]}".`,
  //     },
  //     { status: 409 },
  //   );
  // }

  const status = await dbContext.documentStatus.findFirst({
    where: {
      id: body.statusId,
    },
  });

  if (!status) {
    return NextResponse.json(
      { error: "Cannot update document to unknown status." },
      { status: 400 },
    );
  }

  const updated = await dbContext.document.update({
    where: {
      id,
    },
    data: {
      ...doc,
      statusId: status.id,
      updatedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ updated });
}
