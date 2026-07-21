"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconCheck,
  IconInnerShadowTop,
  IconLoader2,
  IconLogout,
  IconSparkles,
} from "@tabler/icons-react"
import { toast } from "sonner"

import type { Plan } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"

const RECOMMENDED_PLAN_ID = "professional"

export function OnboardingView() {
  const {user} = useAuth();
  const router = useRouter()
  const [plans, setPlans] = React.useState<Plan[]>();
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const idempotencyKey = crypto.randomUUID();

  async function choosePlan(plan: Plan) {
    if (pendingId) return
    setPendingId(plan.id)
    try {
      const res = await fetch("/api/protected/plans/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
         },
        body: JSON.stringify({ planId: plan.id }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(payload.error ?? "Could not start checkout.")
        setPendingId(null)
        return
      }
      const { actionUrl, fields } = payload;

    // Build a hidden form and submit it — this navigates the browser to PayFast
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
      toast.error("Could not start checkout. Please try again.")
      setPendingId(null)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  async function fetchPlans() {
    if (pendingId) return
    try {
      const res = await fetch("/api/protected/plans", {
        method: "GET",
        headers: { "Content-Type": "application/json",credentials: 'include'},
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(payload.error ?? "Could not start checkout.")
        setPendingId(null)
        return
      }
      return payload.plans;
    } catch {
      toast.error("Could not fetch plans. Please try again.")
      setPendingId(null)
    }
  }

  React.useEffect(()=>{
    setIsLoading(true)
    fetchPlans().then(result=>setPlans(result)).catch(()=>{}).finally(()=>setIsLoading(false))
  }, []);

  return (
    <main className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <IconInnerShadowTop className="size-4" />
          </div>
          <span className="text-sm font-semibold">Document Workspace</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={handleLogout}
        >
          <IconLogout className="size-4" />
          Sign out
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 lg:py-14">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Welcome, {user && user.name.split(" ")[0]}
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight">
            Choose a license for {user && user.tenant}
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-muted-foreground">
            Your firm needs an active license before you can create documents
            and invite your team. Pick the plan that fits and complete a quick,
            secure checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans?.map((plan, ) => {
            const recommended = plan.name.toLowerCase() === RECOMMENDED_PLAN_ID
            const isPending = pendingId === plan.id
            const features = plan.name==="Starter"?[
              `Up to ${plan.seatLimit} team members`,
              `${plan.documentLimit} documents`,
              "Document lifecycle workflow",
              "Email support",
            ]:plan.name==="Professional"?[
              `Up to ${plan.seatLimit} team members`,
              `${plan.documentLimit} documents`,
              "Priority support",
              "Advanced insights",
            ]:[
              "Unlimited team members",
              "Unlimited documents",
              "Dedicated account manager",
              "SSO & audit logs",
            ]
            return (
              <Card
                key={plan.id}
                className={
                  recommended
                    ? "flex flex-col border-primary ring-1 ring-primary"
                    : "flex flex-col"
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {recommended ? (
                      <Badge>
                        <IconSparkles className="size-3" />
                        Recommended
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="pt-2">
                    <span className="text-3xl font-semibold tabular-nums">
                      {`R${(plan.priceCents).toFixed(2)}`}
                    </span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="flex flex-col gap-2 text-sm">
                    

                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-auto w-full"
                    variant={recommended ? "default" : "secondary"}
                    disabled={pendingId !== null}
                    onClick={() => choosePlan(plan)}
                  >
                    {isPending ? (
                      <>
                        <IconLoader2 className="size-4 animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Test mode — checkout is simulated and no card is charged. You can
          change your plan anytime after setup.
        </p>
      </div>

      {isLoading && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </main>
  )
}
