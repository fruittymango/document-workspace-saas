"use server";
import "dotenv/config";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { demoFirms, demoUsers, hashPassword } from "@/lib/utils";

const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const seedDocs = [
  { title: "Q3 Financial Statements" },
  {
    title: "Payroll Reconciliation — August",
  },
  { title: "VAT Return 2025" },
  { title: "Annual Audit Report FY24" },
  { title: "Expense Policy Update" },
  {
    title: "Client Onboarding — Northwind",
  },
  { title: "Depreciation Schedule 2025" },
  { title: "Corporate Tax Filing" },
];

export async function seed() {
  try {
    const tenantsCreated = await prisma.tenant.createManyAndReturn({
      data: demoFirms,
    });
    if (!tenantsCreated) {
      throw "Failed to seed db with tenants";
    }
    const newUsers = demoUsers.map((value) => {
      const tenant = tenantsCreated.filter((t, i) =>
        t.name.toLowerCase().includes(value.email.split("@")[1].split(".")[0]),
      );

      return {
        ...value,
        passwordHash: hashPassword("octro@123"),
        tenantId:
          tenant && tenant?.length ? tenant[0].id : tenantsCreated[2].id,
      };
    });

    const usersCreated = await prisma.user.createMany({ data: newUsers });
    if (!usersCreated) {
      throw "Failed to seed db with users";
    }

    const statuses = await prisma.documentStatus.findMany();

    const owners = await prisma.user.findMany();

    const plans = await prisma.plan.findMany();

    const roles = await prisma.role.findMany();

    const ownerRole = roles.filter((value, index) => value.code === "owner");
    for (let i = 0; i < owners.length; i++) {
      await prisma.userRole.create({
        data: {
          tenantId: owners[i].tenantId,
          userId: owners[i].id,
          roleId: ownerRole && ownerRole[0].id,
        },
      });
      // add a license for owner
      const plan = plans[Math.floor(Math.random() * 3)];
      const mPaymentId = crypto.randomUUID();
      const lpaid = await prisma.licensePayment.create({
        data: {
          tenantId: owners[i].tenantId,
          planId: plan.id,
          mPaymentId: mPaymentId,
          amountCents: plan.priceCents,
          currency: plan.currency,
          status: "complete",
          pfPaymentId: crypto.randomUUID(),
          rawItnPayload: crypto.randomUUID(),
        },
      });

      const now = new Date();
      const periodEnd = new Date(now);
      plan.billingInterval === "annual"
        ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        : periodEnd.setMonth(periodEnd.getMonth() + 1);

      const tenantLicense = await prisma.tenantLicense.create({
        data: {
          tenantId: owners[i].tenantId,
          planId: plan.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: now,
        },
      });

      await prisma.licensePayment.update({
        where: {
          id: lpaid.id,
        },
        data: {
          tenantLicenseId: tenantLicense.id,
        },
      });

      const newDocuments = seedDocs.map((value) => {
        return {
          ...value,
          title:
            owners[i].surname + " - " + value.title + "-" + owners[i].createdAt,
          tenantId: owners[i].tenantId,
          statusId:
            statuses[Math.floor(Math.random() * (statuses.length - 1))].id,
        };
      });
      const documentsCreated = await prisma.document.createMany({
        data: newDocuments,
      });
      if (!documentsCreated) {
        throw "Failed to seed db with users";
      }
    }
  } catch (error) {
    console.log("Failed to seed records", error);
  }
}

seed();
