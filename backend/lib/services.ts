import { AuthenticatedAPIContext } from "./api-guard";
import { getTenantUsage } from "./billing";
import prisma from "./prisma";
import { User } from "./types";

export async function findUserByEmail(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase();

  const data = await prisma.$queryRaw<User[]>`
      SELECT * FROM get_user_for_auth(${normalized}::text);
    `;

  return data[0] as unknown as User;
}

export async function findUserById(id: string): Promise<User> {
  const normalized = id.trim().toLowerCase();

  const data = await prisma.$queryRaw<User[]>`
      SELECT * FROM get_user_details(${normalized}::uuid);
    `;

  return data[0] as unknown as User;
}

export async function addNewSignup(
  name: string,
  surname: string,
  firmName: string,
  email: string,
  password: string,
): Promise<User> {
  const normalized = email.trim().toLowerCase();

  const data = await prisma.$queryRaw<User[]>`
      SELECT * FROM create_tenant_and_user(${name}::text,${surname}::text,${firmName}::text,${normalized}::text, ${password}::text);
    `;

  return data[0] as unknown as User;
}

export interface DailyCumulativeStat {
  date: Date;
  created: number;
  total: number;
}

export async function getTenantAnalyticsDashboard(
  ctx: AuthenticatedAPIContext,
  daysDuration: number = 30,
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysDuration);

  const [totalDocuments, recentDoc, statusStats, timelineStats] =
    await Promise.all([
      ctx.db.document.count({
        where: {
          tenantId: ctx.tenantId,
        },
      }),
      ctx.db.document.findMany({
        where: {
          tenantId: ctx.tenantId,
          updatedAt: { gte: cutoffDate },
        },
        include: {
          status: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      ctx.db.document.groupBy({
        by: ["statusId"],
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: cutoffDate },
        },
        _count: { _all: true },
      }),
      ctx.db.$queryRaw<DailyCumulativeStat[]>`
      WITH daily_counts AS (
        SELECT 
          DATE_TRUNC('day', "created_at") AS date_group,
          COUNT(*)::int AS created_count
        FROM "documents"
        WHERE "tenant_id" = ${ctx.tenantId}
          AND "created_at" >= NOW() - CAST(${daysDuration} || ' days' AS INTERVAL)
        GROUP BY date_group
      )
      SELECT 
        date_group AS "date",
        created_count AS "created",
        SUM(created_count) OVER(ORDER BY date_group ASC)::int AS "total"
      FROM daily_counts
      ORDER BY "date" ASC;
    `,
    ]);
  const minorTotal = statusStats.reduce(
    (sum, item) => sum + item._count._all,
    0,
  );
  const countsByStatus = Object.fromEntries(
    statusStats.map((s) => [s.statusId, s._count._all]),
  );

  const dbTimelineMap = new Map(
    timelineStats.map((row) => {
      const year = row.date.getFullYear();
      const month = String(row.date.getMonth() + 1).padStart(2, "0");
      const day = String(row.date.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      return [key, row];
    }),
  );
  const fullTimeline: DailyCumulativeStat[] = [];
  let runningTotalAccumulator = 0;

  for (let i = daysDuration - 1; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);
    targetDate.setHours(0, 0, 0, 0);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    const existingDbRow = dbTimelineMap.get(dateKey);
    if (existingDbRow) {
      runningTotalAccumulator = existingDbRow.total;
      fullTimeline.push({
        date: new Date(targetDate),
        created: existingDbRow.created,
        total: runningTotalAccumulator,
      });
    } else {
      fullTimeline.push({
        date: new Date(targetDate),
        created: 0,
        total: runningTotalAccumulator,
      });
    }
  }

  const billing = await getTenantUsage(ctx.tenantId);

  return {
    minorTotal,
    totalDocuments,
    latestUpdatedDocument: recentDoc,
    statusCounts: countsByStatus,
    timeline: fullTimeline,
    billing: {
      plan: billing.license?.plan.name,
      plan_id: billing.license?.planId,
      priceCents: billing.license?.plan.priceCents,
      license_status: billing.licenseStatus,
      renewsAt: billing.currentPeriodEnd,
      seatsUsed: billing.seatsUsed,
      seatsRemaining: billing.seatsRemaining,
      seatLimit: billing.seatLimit,
      documentLimit: billing.documentLimit,
      documentsRemaining: billing.documentsRemaining,
      documentsUsed: billing.documentsUsed,
    },
  };
}
