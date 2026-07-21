import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { Plan } from "@/prisma/generated/client";
import { Plan_id } from "./types";
import type { DocumentRecord, UserRole } from "@/lib/types";

export interface TenantStats {
  total: number;
  byStatus: Record<string, number>;
  /** Cumulative documents per day over the trailing window. */
  activity: Array<{ date: string; created: number; total: number }>;
  /** Most recently updated documents (max 5). */
  recent: Array<Pick<DocumentRecord, "id" | "title" | "status" | "updatedAt">>;
}

export function limitLabel(limit: number | null) {
  return limit === null ? "Unlimited" : limit.toLocaleString();
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  owner: "Owner",
  member: "Member",
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  draft: "outline",
  unassigned: "default",
  assigned: "secondary",
  filed: "outline",
  archived: "default",
};

export const demoFirms = [
  { name: "Ledger & Co" },
  { name: "Bossman Trading" },
  { name: "Carri Pty (Ltd)" },
];

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const demoUsers = [
  {
    name: "Toni",
    surname: "Kroos",
    email: "toni@ledger.com",
  },
  {
    name: "Themba",
    surname: "Coetzee",
    email: "themba@bossman.com",
  },
  {
    name: "Carol",
    surname: "Sing",
    email: "carol@carrim.com",
  },
];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hashPassword(password: string): string {
  const salt = randomUUID().replace(/-/g, "");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

export function isAtLimit(used: number, limit: number | null): boolean {
  if (limit === null) return false;
  return used >= limit;
}

/**
 * Returns a 0-100 utilization percentage against a limit.
 * Unlimited limits (`null`) always report 0.
 */
export function utilization(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export const PLANS: Plan[] = [];
export function getPlan(id: Plan_id): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

export function isValidPlanId(value: unknown): value is Plan_id {
  return typeof value === "string" && PLANS.some((plan) => plan.id === value);
}

/** Position of a plan in the upgrade ladder (0 = lowest tier). */
export function planRank(id: Plan_id): number {
  return PLANS.findIndex((plan) => plan.id === id);
}
