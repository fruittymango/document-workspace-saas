import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buildPayfastPayment } from "@/lib/payfast";
import { completeIdempotentRequest } from "@/lib/idempotency";
import { Prisma } from "@/prisma/generated/client";
import { AuthenticatedAPIContext, withTenantAPI } from "@/lib/api-guard";
import prisma from "@/lib/prisma";

/**
 * Creates a pending checkout session for a plan change. This validates the
 * requested plan exactly like a real payment provider would before handing
 * off to the hosted payment page. It does NOT change the plan — that only
 * happens when the checkout is settled as paid.
 */
export const POST = withTenantAPI(async (request, ctx) => {
  try {
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

    let body: { planId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 422 },
      );
    }

    const { planId } = body;
    if (!planId) {
      return NextResponse.json(
        { error: "Invalid plan id provided." },
        { status: 400 },
      );
    }

    // Guard against downgrading below current seat usage.
    const target = await ctx.db.plan.findFirst({ where: { id: planId } });
    if (!target) {
      return NextResponse.json(
        { error: "Plan does not exist." },
        { status: 404 },
      );
    }

    const current = await ctx.db.tenantLicense.findFirst({
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

    const seatsUsed = await ctx.db.user.count({
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
    await ctx.db.licensePayment.create({
      data: {
        tenantId: session.tenant_id,
        planId: target.id,
        mPaymentId: mPaymentId,
        amountCents: target.priceCents,
        currency: target.currency,
        status: "pending", // disabling since we dont have a live url for the itn cb
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
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Server failing to submit checkout." },
      { status: 500 },
    );
  }
});

async function upsertTenantLicense(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    planId: string;
    status: "active";
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  },
) {
  const existing = await tx.tenantLicense.findFirst({
    where: {
      tenantId: params.tenantId,
      status: { in: ["trialing", "active", "past_due"] },
    },
  });

  if (existing) {
    return tx.tenantLicense.update({
      where: { id: existing.id },
      data: {
        planId: params.planId,
        status: params.status,
        currentPeriodStart: params.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd,
      },
    });
  }

  return tx.tenantLicense.create({
    data: {
      tenantId: params.tenantId,
      planId: params.planId,
      status: params.status,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
    },
  });
}

async function doOverridePayfast(
  idempotencyKey: string,
  ctx: AuthenticatedAPIContext,
) {
  const payment = await ctx.db.licensePayment.findUniqueOrThrow({
    where: { mPaymentId: idempotencyKey },
    include: { plan: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.licensePayment.update({
      where: { id: payment.id },
      data: {
        status: "complete",
        pfPaymentId: crypto.randomUUID(),
        rawItnPayload: crypto.randomUUID(),
      },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    payment.plan.billingInterval === "annual"
      ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      : periodEnd.setMonth(periodEnd.getMonth() + 1);

    await upsertTenantLicense(tx, {
      tenantId: payment.tenantId,
      planId: payment.planId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    // await tx.tenantLicense.upsert({
    //   where: { id: payment.id }, // requires the partial unique index, or adjust to findFirst+create
    //   update: {
    //     planId: payment.planId,
    //     status: "active",
    //     currentPeriodStart: now,
    //     currentPeriodEnd: periodEnd,
    //   },
    //   create: {
    //     tenantId: payment.tenantId,
    //     planId: payment.planId,
    //     status: "active",
    //     currentPeriodStart: now,
    //     currentPeriodEnd: periodEnd,
    //   },
    // });
  });
  await completeIdempotentRequest(idempotencyKey, 200, { ok: true });
}
