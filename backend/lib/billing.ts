"use server"

import prisma from "./prisma";

export const getPlans= async() => await prisma.plan.findMany();

export const getLicensePlan = async(tenantId:string) => await prisma.tenantLicense.findFirst({
    where: {
      tenantId,
      status: { in: ["trialing", "active", "past_due"] },
    },
    include: { plan: true },
  });

export async function getTenantUsage(tenantId: string) {
  const [license, seatsUsed, documentsUsed] = await Promise.all([
    prisma.tenantLicense.findFirst({
      where: {
        tenantId,
        status: { in: ["trialing", "active", "past_due"] },
      },
      include: { plan: true },
    }),
    prisma.user.count({ where: { tenantId } }),
    prisma.document.count({ where: { tenantId } }),
  ]);

  if (!license) {
    return {
      licenseStatus: null,
      seatsUsed,
      seatLimit: null,
      seatsRemaining: null,
      documentsUsed,
      documentLimit: null,
      documentsRemaining: null,
    };
  }

  const seatLimit = license.plan.seatLimit;
  const documentLimit = license.plan.documentLimit;

  return {
    license,
    licenseStatus: license.status,
    currentPeriodEnd: license.currentPeriodEnd,
    seatsUsed,
    seatLimit,
    seatsRemaining: seatLimit && Math.max(seatLimit - seatsUsed, 0),
    documentsUsed,
    documentLimit,
    documentsRemaining:
      documentLimit && Math.max(documentLimit - documentsUsed, 0),
  };
}

export async function getTenantCheckoutPlan(tenantId: string,mPaymentId:string ) {
  const checkoutPlan= await prisma.licensePayment.findFirst({
      where: {
        tenantId,
        mPaymentId,
      },
      include: { plan: true },
    });
  return checkoutPlan
}