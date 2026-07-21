import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buildPayfastPayment } from "@/lib/payfast";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Only admins may start a plan change / checkout.
  if (
    session.role_name.toLowerCase() !== "owner" &&
    session.role_name.toLowerCase() !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { planId } = body;
  if (!planId) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  // Guard against downgrading below current seat usage.
  const target = await prisma.plan.findFirst({ where: { id: planId } });
  if (!target) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const current = await prisma.tenantLicense.findFirst({
    where: {
      tenantId: session.tenant_id,
      planId,
      status: "active",
    },
  });
  if (current) {
    return NextResponse.json(
      { error: "You are already on this plan." },
      { status: 409 },
    );
  }

  const seatsUsed = await prisma.user.count({
    where: { tenantId: session.tenant_id },
  });
  if (target?.seatLimit && seatsUsed > target?.seatLimit) {
    return NextResponse.json(
      {
        error: `The ${target?.name} plan allows ${target?.seatLimit} seats, but your firm has ${seatsUsed} members.`,
      },
      { status: 409 },
    );
  }

  const mPaymentId = crypto.randomUUID();
  await prisma.licensePayment.create({
    data: {
      tenantId: session.tenant_id,
      planId: target.id,
      mPaymentId: mPaymentId,
      amountCents: target.priceCents,
      currency: target.currency,
      // status: "pending", // disabling since we dont have a live url for the itn cb
      status: "complete",
    },
  });

  const payment = buildPayfastPayment({
    merchant_id: process.env.PAYFAST_MERCHANT_ID!,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
    return_url: `${process.env.APP_URL}/billing/callback/${mPaymentId}`,
    cancel_url: `${process.env.APP_URL}/billing/callback/${mPaymentId}`,
    notify_url: `${process.env.APP_URL}/api/payfast/itn`,
    m_payment_id: mPaymentId,
    amount: (target?.priceCents).toFixed(2),
    item_name: `${target?.name} subscription`,
  });
  return NextResponse.json(payment);
}
