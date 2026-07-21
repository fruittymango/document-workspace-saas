import { DocumentStatus, TenantLicense } from "@/prisma/generated/client";
import { BillingInterval, LicenseStatus } from "@/prisma/generated/enums";

export interface Tenant {
  id: string;
  name: string;
}

export type LicenseUsage = {
  license: TenantLicense & { plan: Plan };
  seatsUsed: number;
  documentsUsed: number;
  licenseStatus: LicenseStatus;
  currentPeriodEnd: Date;
  seatLimit: number;
  documentLimit: number;
  documentsRemaining: number;
};
export type SessionUser = Omit<User, "password_hash">;

export interface User {
  id: string;
  tenant_id: string;
  tenant: string;
  name: string;
  surname: string;
  email: string;
  password_hash: string;
  license_id: string;
  license_status: string;
  role_code: string;
  role_name: string;
}

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecordMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** The shape of the user that is safe to expose to the client. */
// export interface SessionUser {
//   id: string
//   tenant_id: string
//   tenant:string;
//   name: string
//   email: string
// }

export type Plan_id = "starter" | "professional" | "enterprise";

export interface Plan {
  id: Plan_id;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  seatLimit: number | null;
  isActive: boolean;
  billingInterval: BillingInterval;
  documentLimit: number | null;
  features: string[];
}

export interface Tenant {
  id: string;
  name: string;
  plan_id: Plan_id;
  /** ISO date of the next renewal / invoice. */
  renewsAt: string;
}

/** Current licensing + usage snapshot for a single tenant. */
export interface TenantBilling {
  plan_id: Plan_id;
  renewsAt: string;
  seatsUsed: number;
  documentsUsed: number;

  plan: string;
  license_status: string;
  seatsRemaining: number;
  seatLimit: number;
  documentLimit: number;
  documentsRemaining: number;
  priceCents: number;
}

export type CheckoutStatus = "pending" | "complete" | "failed" | "cancelled";

/**
 * A mock payment "session" for a plan change. Stored server-side and scoped
 * to a tenant so the success / failure callback screens can verify the real
 * settled outcome instead of trusting query params.
 */
export interface Checkout {
  id: string;
  tenant_id: string;
  plan_id: Plan_id;
  /** Monthly amount in USD captured at checkout creation. */
  amount: number;
  status: CheckoutStatus;
  failureReason?: string;
  createdAt: string;
}

/**
 * Access level within a tenant.
 * - `admin`: can manage users and access billing/licensing.
 * - `member`: can  * - `member`: can work with documents only (no billing, no user management).
 * - `owner`: the elevated role

*/
export type UserRole = "admin" | "member" | "owner";

/** User shape that is safe to expose to the client (no password hash). */
export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;

  userRoles?: {
    role: {
      code: string;
      name: string;
      isSystem: boolean;
    };
  }[];
}

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}
