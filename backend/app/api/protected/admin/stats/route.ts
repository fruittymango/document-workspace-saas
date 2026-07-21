import { NextResponse } from "next/server";
import { withTenantAPI } from "@/lib/api-guard";
import { getTenantAnalyticsDashboard } from "@/lib/services";

/**
 * We use the tenant guard to ensure scope the user request records that are
 * associated with their tenant.
 *
 * This endpoint will return stats that provide the user with a snapshot  of
 * their current license usage. We provide data on:
 *  - total documents created,
 *  - 5 of the most recently created documents,
 *  - summative counts of documents in different phases,
 *  - a timeline of amount records created in past x days (the x is provided as a search query parameter)
 *  - and lastly, what all those numbers mean for the plan you are currently on.
 *
 * We provide insight on the plan you are on, when it expires/renews, license status,
 * number of seats in relation to tenant users are remaining, how many have been
 * and what the limit is. The same applies for documents.
 */
export const GET = withTenantAPI(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const daysDuration = Math.max(
      1,
      parseInt(searchParams.get("days") || "1", 30),
    );
    const stats = await getTenantAnalyticsDashboard(ctx, daysDuration);
    return NextResponse.json(
      {
        stats,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Server failing to retrieve analytics" },
      { status: 500 },
    );
  }
});
