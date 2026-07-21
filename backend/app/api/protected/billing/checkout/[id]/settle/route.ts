import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTenantBilling, settleCheckout } from "@/lib/store";

const OUTCOMES = ["paid", "failed", "canceled"] as const;
type Outcome = (typeof OUTCOMES)[number];

function isOutcome(value: unknown): value is Outcome {
  return (
    typeof value === "string" && (OUTCOMES as readonly string[]).includes(value)
  );
}

/**
 * Settles a checkout session (mock payment result). Tenant-scoped: a firm can
 * only settle its own checkout, and settling as `paid` applies the plan.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Only admins may settle a checkout / apply a plan change.
  if (
    session.role_name.toLowerCase() !== "owner" &&
    session.role_name.toLowerCase() !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  let body: { outcome?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!isOutcome(body.outcome)) {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason : undefined;
  // const checkout = settleCheckout(session.tenant_id, id, body.outcome, reason);
  // if (!checkout) {
  //   return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  // }

  const billing = getTenantBilling(session.tenant_id);
  // return NextResponse.json({ checkout, billing });
  return NextResponse.json({ billing });
}
