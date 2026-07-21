"use client";
import * as React from "react";
import useSWR from "swr";
import {
  IconCheck,
  IconLoader2,
  IconUsers,
  IconFiles,
  IconCalendarDue,
  IconSparkles,
} from "@tabler/icons-react";
import { toast } from "sonner";

import type { LicenseUsage, Plan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { formatDate, isAtLimit, limitLabel, utilization } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { billingFetcher } from "@/lib/api";

export interface BillingResponse {
  billing: LicenseUsage;
  plans: Plan[];
}

export function BillingView() {
  const { user } = useAuth();
  const { data, isLoading } = useSWR(
    "/api/protected/billing",
    billingFetcher,
    {},
  );

  const billing = data?.billing;
  const plans = data?.plans;
  const currentPlan = billing?.license.plan;
  const currentRank = billing?.license.plan?.priceCents;

  const [pendingPlan, setPendingPlan] = React.useState<Plan | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const seatPct = utilization(
    billing?.seatsUsed || 0,
    data?.billing?.seatLimit || 0,
  );
  const docPct = utilization(
    billing?.documentsUsed || 0,
    data?.billing?.documentLimit || 0,
  );
  const seatsMaxed = isAtLimit(
    data?.billing?.seatsUsed || 0,
    data?.billing?.seatLimit || 0,
  );
  const idempotencyKey = React.useRef(crypto.randomUUID());

  async function startCheckout() {
    if (!pendingPlan) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/protected/plans/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
          credentials: "include",
        },
        body: JSON.stringify({ planId: pendingPlan.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error ?? "Could not start checkout.");
        setSubmitting(false);
        return;
      }
      const { actionUrl, fields } = payload;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = actionUrl;

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch {
      toast.error("Could not start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base font-medium">Billing &amp; Licensing</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {user && user.tenant}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        {/* Current plan + usage */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardDescription>Current plan</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  {billing?.license.plan?.name}
                  <Badge variant="secondary">Active</Badge>
                </CardTitle>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums">
                  R{(billing?.license.plan?.priceCents || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <IconUsers className="size-4" />
                    Seats
                  </span>
                  <span className="font-medium tabular-nums">
                    {billing?.seatsUsed} /{" "}
                    {limitLabel(currentPlan?.seatLimit || 0)}
                  </span>
                </div>
                <Progress value={seatPct} />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <IconFiles className="size-4" />
                    Documents
                  </span>
                  <span className="font-medium tabular-nums">
                    {billing?.documentsUsed} /{" "}
                    {limitLabel(currentPlan?.documentLimit || 0)}
                  </span>
                </div>
                <Progress value={docPct} />
              </div>
            </div>

            <Separator />

            {billing && billing?.currentPeriodEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconCalendarDue className="size-4" />
                Renews on{" "}
                <span className="font-medium text-foreground">
                  {formatDate(
                    new Date(billing?.currentPeriodEnd).toISOString(),
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan options */}
        <div>
          <h2 className="mb-1 text-lg font-medium">Plans</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Upgrade to add seats, documents, and features for{" "}
            {user && user.tenant}.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {plans?.map((plan) => {
              const isCurrent = plan.id === billing?.license.planId;
              const rank = plan.priceCents;
              const isUpgrade = rank > (currentRank || 0);
              // Cannot pick a plan whose seat limit is below current usage.
              const seatBlocked =
                plan.seatLimit !== null &&
                (billing?.seatsUsed || 0) > plan.seatLimit;
              const features =
                plan.name === "Starter"
                  ? [
                      `Up to ${plan.seatLimit} team members`,
                      `${plan.documentLimit} documents`,
                      "Document lifecycle workflow",
                      "Email support",
                    ]
                  : plan.name === "Professional"
                    ? [
                        `Up to ${plan.seatLimit} team members`,
                        `${plan.documentLimit} documents`,
                        "Priority support",
                        "Advanced insights",
                      ]
                    : [
                        "Unlimited team members",
                        "Unlimited documents",
                        "Dedicated account manager",
                        "SSO & audit logs",
                      ];
              return (
                <Card
                  key={plan.id}
                  className={
                    isCurrent ? "border-primary ring-1 ring-primary" : undefined
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {isCurrent ? (
                        <Badge variant="secondary">Current</Badge>
                      ) : isUpgrade ? (
                        <Badge>
                          <IconSparkles className="size-3" />
                          Upgrade
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="pt-2">
                      <span className="text-3xl font-semibold tabular-nums">
                        R{plan.priceCents.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        / month
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <ul className="flex flex-col gap-2 text-sm">
                      {features.map((feature) => {
                        return (
                          <li key={feature} className="flex items-start gap-2">
                            <IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>{feature}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <Button
                      className="mt-auto w-full"
                      variant={
                        isCurrent
                          ? "outline"
                          : isUpgrade
                            ? "default"
                            : "secondary"
                      }
                      disabled={isCurrent || seatBlocked}
                      onClick={() => setPendingPlan(plan)}
                    >
                      {isCurrent
                        ? "Current plan"
                        : seatBlocked
                          ? "Too few seats"
                          : isUpgrade
                            ? "Upgrade"
                            : "Switch to this plan"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {seatsMaxed ? (
          <p className="text-sm text-muted-foreground">
            You have reached your seat limit. Upgrade your plan to invite more
            team members.
          </p>
        ) : null}
      </div>

      <AlertDialog
        open={pendingPlan !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPlan(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingPlan && pendingPlan.priceCents > (currentRank || 0)
                ? `Upgrade to ${pendingPlan?.name}?`
                : `Switch to ${pendingPlan?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan
                ? `You'll continue to a secure payment page to pay R${(
                    pendingPlan.priceCents || 0
                  ).toFixed(2)} per month for the ${pendingPlan.name} plan.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                idempotencyKey.current = crypto.randomUUID();
                startCheckout();
              }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                "Continue to payment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {(isLoading || submitting) && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </div>
  );
}
