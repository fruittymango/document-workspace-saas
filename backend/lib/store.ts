import type { DocumentRecord, Tenant, User } from "./types";

interface Store {
  tenants: Map<string, Tenant>;
  users: Map<string, User>;
  documents: Map<string, DocumentRecord>;
}

const globalForStore = globalThis as unknown as { __docWorkspaceStore?: Store };
const store: Store = globalForStore.__docWorkspaceStore ?? seed();
if (!globalForStore.__docWorkspaceStore) {
  globalForStore.__docWorkspaceStore = store;
}

/* -------------------------- Analytics / Admin --------------------------- */

export interface TenantStats {
  total: number;
  byStatus: Record<string, number>;
  /** Cumulative documents per day over the trailing window. */
  activity: Array<{ date: string; created: number; total: number }>;
  /** Most recently updated documents (max 5). */
  recent: Array<Pick<DocumentRecord, "id" | "title" | "status" | "updatedAt">>;
}

import type { Checkout, CheckoutStatus, TenantBilling } from "./types";

interface Store {
  tenants: Map<string, Tenant>;
  users: Map<string, User>;
  documents: Map<string, DocumentRecord>;
  checkouts: Map<string, Checkout>;
}

function seed(): Store {
  const tenants = new Map<string, Tenant>();
  const users = new Map<string, User>();
  const documents = new Map<string, DocumentRecord>();
  const checkouts = new Map<string, Checkout>();

  // Renewal 18 days out, aligned to midnight for stable display.
  const renewal = new Date();
  renewal.setHours(0, 0, 0, 0);
  renewal.setDate(renewal.getDate() + 18);
  const renewsAt = renewal.toISOString();

  const firms: Tenant[] = [
    { id: "ledger", name: "Ledger & Co", plan_id: "starter", renewsAt },
    {
      id: "balance",
      name: "Balance Partners",
      plan_id: "professional",
      renewsAt,
    },
  ];

  for (const t of firms) tenants.set(t.id, t);

  const now = Date.now();

  return { tenants, users, documents, checkouts };
}

/* -------------------------------- Billing ------------------------------- */

export function countTenantUsers(tenant_id: string): number {
  let count = 0;
  for (const user of store.users.values()) {
    if (user.tenant_id === tenant_id) count += 1;
  }
  return count;
}

export function countTenantDocuments(tenant_id: string): number {
  let count = 0;
  for (const doc of store.documents.values()) {
    if (doc.tenant_id === tenant_id) count += 1;
  }
  return count;
}

/**
 * Returns the licensing + usage snapshot for a tenant. Seat and document
 * counts are computed from tenant-scoped records only, so a firm can never
 * see another firm's usage.
 */
export function getTenantBilling(tenant_id: string): TenantBilling | undefined {
  const tenant = store.tenants.get(tenant_id);
  if (!tenant) return undefined;
  // return {
  //   plan_id: tenant.plan_id,
  //   renewsAt: tenant.renewsAt,
  //   seatsUsed: countTenantUsers(tenant_id),
  //   documentsUsed: countTenantDocuments(tenant_id),
  // };
}

/**
 * Settles a pending checkout. On a successful payment the tenant's plan is
 * applied. All access is scoped to `tenant_id`, so one firm can never settle
 * another firm's checkout.
 */
export function settleCheckout(
  tenant_id: string,
  id: string,
  outcome: Exclude<CheckoutStatus, "pending">,
  failureReason?: string,
): Checkout | undefined {
  let checkout; //getTenantCheckout(tenant_id, id);
  if (!checkout) return undefined;
  // if (checkout.status !== "pending") return checkout;

  // if (outcome === "paid") {
  //   setTenantPlan(tenant_id, checkout.plan_id);
  // }
  // checkout.status = outcome;
  // if (outcome === "failed") {
  //   checkout.failureReason =
  //     failureReason ?? "Your payment could not be processed.";
  // }
  store.checkouts.set(id, checkout);
  return checkout;
}
