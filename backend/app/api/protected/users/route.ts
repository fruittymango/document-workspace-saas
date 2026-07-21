import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { withTenantAPI } from "@/lib/api-guard";
import { NewUserSchema } from "@/lib/schema";

function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "member";
}

export const GET = withTenantAPI(async (request, ctx) => {
  try {
    if (
      ctx.role_code.toLowerCase() !== "owner" &&
      ctx.role_code.toLowerCase() !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const users =
      (await ctx.db.user
        .findMany({
          where: {
            tenantId: ctx.tenantId,
          },
          omit: {
            passwordHash: true,
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        })
        .catch((err) => console.error(err))) || [];
    return NextResponse.json({ users });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Server failing to retrieve users." },
      { status: 500 },
    );
  }
});

export const POST = withTenantAPI(async (request, ctx) => {
  try {
    if (
      ctx.role_code.toLowerCase() !== "owner" &&
      ctx.role_code.toLowerCase() !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let body = await request.json();

    const validatedBody = NewUserSchema.safeParse(body);

    if (!validatedBody.success) {
      console.log(validatedBody.error);
      return NextResponse.json(
        { error: "Fails schema validation" },
        { status: 422 },
      );
    }

    // Enforce the plan's licensed seat limit before adding a member.
    const [license, seatsUsed] = await Promise.all([
      ctx.db.tenantLicense.findFirst({
        where: {
          tenantId: ctx.tenantId,
          status: { in: ["trialing", "active", "past_due"] },
        },
        include: { plan: true },
      }),
      ctx.db.user.count({ where: { tenantId: ctx.tenantId } }),
    ]);

    if (license) {
      const plan = license.plan;
      if (plan.seatLimit !== null && seatsUsed >= plan?.seatLimit) {
        return NextResponse.json(
          {
            error: `Your ${plan.name} plan is limited to ${plan.seatLimit} seats. Upgrade your plan to add more members.`,
          },
          { status: 409 },
        );
      }
    }

    const passwordHash = hashPassword(validatedBody.data.password);

    const result = await ctx.db.user.create({
      data: {
        tenantId: ctx.tenantId,
        name: validatedBody.data.name,
        surname: validatedBody.data.surname,
        email: validatedBody.data.email,
        passwordHash,
      },
    });

    if ("error" in result) {
      if (result.error === "email_taken") {
        return NextResponse.json(
          { error: "That email is already in use." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Could not create user." },
        { status: 400 },
      );
    }

    const role = await ctx.db.role.findFirst({
      where: {
        code: validatedBody.data.role.trim().toLowerCase(),
      },
    });

    if (role) {
      await ctx.db.userRole.create({
        data: {
          userId: result.id,
          roleId: role.id,
          tenantId: ctx.tenantId,
        },
      });
    } else {
      const member = await ctx.db.role.findFirst({
        where: {
          name: "member",
        },
      });
      if (member) {
        await ctx.db.userRole.create({
          data: {
            userId: result.id,
            roleId: member.id,
            tenantId: ctx.tenantId,
          },
        });
      }
    }

    return NextResponse.json({ user: result }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Server failing to save user." },
      { status: 500 },
    );
  }
});
