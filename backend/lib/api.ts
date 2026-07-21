import { DocumentStatus, Plan, TenantLicense } from "@/prisma/generated/client";
import {
  DocumentRecord,
  DocumentRecordMeta,
  TenantBilling,
  TenantUser,
} from "./types";
import { TenantStats } from "./utils";
import { BillingResponse } from "@/components/billing-view";

export const fetchUser = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed to load user.");
  const result = await res.json();
  return result;
};

export const usersFetcher = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed to load users.");
  return res.json() as Promise<{ users: TenantUser[] }>;
};

export const planFetcher = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed fetch plan billing.");
  return res.json() as Promise<{ licensePlan: TenantLicense & { plan: Plan } }>;
};

export const statsFetcher = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed to load activity.");
  return res.json() as Promise<{
    stats: {
      minorTotal: TenantStats["total"];
      totalDocuments: TenantStats["total"];
      timeline: TenantStats["activity"];
      statusCounts: TenantStats["byStatus"];
      latestUpdatedDocument: TenantStats["recent"];
      billing: TenantBilling;
    };
  }>;
};

export const billingFetcher = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed to load billing.");
  return res.json() as Promise<BillingResponse>;
};

export const documentStatusFetcher = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed to load document statuses.");
  return res.json() as Promise<{
    statuses: DocumentStatus[];
  }>;
};

export const documentsFetcher = async (url: string) => {
  const res = await fetch(url, { headers: { credentials: "include" } });
  if (!res.ok) throw new Error("Failed to load documents.");
  return res.json() as Promise<{
    documents: DocumentRecord[];
    meta: DocumentRecordMeta;
  }>;
};
