import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createTenantPrismaClient } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { role: string };
  try {
    body = await request.json();
    if (!body.role) {
      return NextResponse.json(
        { error: "Fails schema validation." },
        { status: 422 },
      );
    }

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

    const dbContext = await createTenantPrismaClient(session.tenant_id);

    const newRole = await dbContext.role.findFirst({
      where: {
        code: body.role.trim().toLowerCase(),
      },
    });

    if (!newRole) {
      return NextResponse.json(
        { error: "Role doesn't exist." },
        { status: 400 },
      );
    }

    const ex = await dbContext.userRole.findFirst({
      where: {
        userId: id,
      },
    });
    if (ex) {
      await dbContext.userRole.update({
        where: {
          userId_roleId: {
            userId: ex.userId,
            roleId: ex.roleId,
          },
        },
        data: {
          roleId: newRole.id,
        },
      });
    }

    return NextResponse.json({}, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Server fails request" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  // An admin cannot remove their own account from this screen.
  if (id === session.id) {
    return NextResponse.json(
      { error: "You cannot remove your own account." },
      { status: 409 },
    );
  }

  const dbContext = createTenantPrismaClient(session.tenant_id);

  // Scoped strictly to the caller's tenant.
  const result = await dbContext.user.delete({
    where: {
      tenantId: session.tenant_id,
      id,
    },
  });

  if (!result) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
