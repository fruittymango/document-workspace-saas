import { PrismaClient } from "../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Creates an isolated, ephemeral Prisma client instance explicitly bound 
 * to a specific tenant for the duration of a single API request lifecycle.
 */
export function createTenantPrismaClient(tenantId: string) {
  if (!tenantId) {
    throw new Error('Database Security Breach Protocol: Cannot instantiate client without a validated tenant ID.');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Every database call on this returned client instance gets locked into this transaction block
          return prisma.$transaction(async (tx) => {
            // Safe injection: tenantId must be a verified string format
            await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}';`);
            return query(args);
          }, { timeout: 5000 });
        },
      },
    },
  });
}
export default prisma;
