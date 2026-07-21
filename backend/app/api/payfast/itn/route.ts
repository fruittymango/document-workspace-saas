import { NextRequest, NextResponse } from "next/server";
import { validatePayfastSignature } from "@/lib/payfast";
import db from "@/lib/prisma";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  abortIdempotentRequest,
} from "@/lib/idempotency";
import { Prisma } from "@/prisma/generated/client";

/**
 * Custom update or insert function to handle the creation/updating of tenant license
 * that been successfully processed.
 * Will create a new license on newly bought licenses.
 * Will update license that were finalized later than date of creation.
 */
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

/**
 * Payfast will call this endpoint upon successfully processing a transaction that
 * belongs to us. We verify the payload we receive from payfast using a local verification method
 * and then we run query to payfast to double check the payload received before we
 * process licenses. The endpoint makes provision for idempotency and
 * creates and/or updates a license upon successful verification.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const payload: Record<string, string> = {};
  const payfastValidationParams = new URLSearchParams();

  formData.forEach((value, key) => {
    payload[key] = value.toString();
    payfastValidationParams.append(key, value.toString());
  });
  const idempotencyKey = `payfast:${payload.m_payment_id}`;

  let session;
  try {
    session = await beginIdempotentRequest(idempotencyKey);
  } catch {
    return new NextResponse("OK", { status: 200 });
  }

  if (session.state === "completed") {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    const validSig = validatePayfastSignature(
      payload,
      process.env.PAYFAST_PASSPHRASE,
    );
    if (!validSig) throw new Error("Invalid signature");

    const host = process.env.PAYFAST_URL;

    const validateRes = await fetch(`${host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payfastValidationParams.toString(),
    });
    const validateBody = await validateRes.text();
    if (validateBody.trim() !== "VALID")
      throw new Error("PayFast validation rejected ITN");

    const payment = await db.licensePayment.findUniqueOrThrow({
      where: { mPaymentId: payload.m_payment_id },
      include: { plan: true },
    });

    const expectedAmount = payment.amountCents.toFixed(2);
    if (payload.amount_gross !== expectedAmount)
      throw new Error("Amount mismatch");

    if (payload.payment_status === "COMPLETE") {
      await db.$transaction(async (tx) => {
        await tx.licensePayment.update({
          where: { id: payment.id },
          data: {
            status: "complete",
            pfPaymentId: payload.pf_payment_id,
            rawItnPayload: payload,
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
    } else {
      await db.licensePayment.update({
        where: { id: payment.id },
        data: { status: "failed", raw_itn_payload: payload },
      });
    }

    await completeIdempotentRequest(idempotencyKey, 200, { ok: true });
    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    await abortIdempotentRequest(idempotencyKey);
    console.error("PayFast ITN error:", err);
    return new NextResponse("OK", { status: 200 });
  }
}
