import { NextResponse } from "next/server";
import { withTenantAPI } from "@/lib/api-guard";
import { Prisma } from "@/prisma/generated/client";
import { DocumentSchema } from "@/lib/schema";

/**
 * We use the tenant guard to ensure the isolation of user tenant from other
 * tenants. The wrapper will validate the user token, the use that to obtain the
 * tenant id that it would use to prepare the db instance that we then access using
 * the context parameter.
 *
 * The endpoint make use of optional query parameter to return documents, i.e:
 * - page to determine the offset multiplier,
 * - limit to indicate the number of records to limit the query to
 * - search to match records with titles that matches the one given
 *
 */
export const GET = withTenantAPI(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get("limit") || "10", 10)),
  );
  const skip = (page - 1) * limit;
  const search = searchParams.get("search")?.trim() || "";
  const whereClause: Prisma.DocumentWhereInput = search
    ? {
        title: { contains: search, mode: "insensitive" },
        tenantId: ctx.tenantId,
      }
    : {
        tenantId: ctx.tenantId,
      };

  try {
    const [documents, totalCount] = await Promise.all([
      ctx.db.document.findMany({
        where: whereClause,
        include: {
          status: true,
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      ctx.db.document.count({
        where: whereClause,
      }),
    ]);
    const totalPages = Math.ceil(totalCount / limit);
    return NextResponse.json(
      {
        documents,
        meta: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Server failing to retrieve documents." },
      { status: 500 },
    );
  }
});

/**
 * We use the tenant guard to ensure the isolation of user tenant from other
 * tenants. The wrapper will validate the user token, the use that to obtain the
 * tenant id that it would use to prepare the db instance that we then access using
 * the context parameter.
 *
 * The endpoint make use a schema validator to ensure that the payload given
 * matches a schema we want. Upon failure, we communicate accordingly with the user.
 */
export const POST = withTenantAPI(async (req, ctx) => {
  let body: { title: string; statusId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  try {
    const validatedData = DocumentSchema.safeParse(body);
    if (!validatedData?.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 422 },
      );
    }

    const { title, statusId } = body;
    const document = await ctx.db.document.create({
      data: {
        tenantId: ctx.tenantId,
        title,
        statusId,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Server failing to save document" },
      { status: 500 },
    );
  }
});
