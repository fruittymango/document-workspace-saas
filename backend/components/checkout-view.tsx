"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconLock,
  IconCreditCard,
  IconLoader2,
  IconArrowLeft,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type Outcome = "paid" | "failed" | "canceled"

export function CheckoutView({
  checkoutId,
  planName,
  amount,
  tenantName,
}: {
  checkoutId: string
  planName: string
  amount: number
  tenantName: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState<Outcome | null>(null)

  // Cosmetic-only card fields (mock/test mode — nothing is charged).
  const [card, setCard] = React.useState("4242 4242 4242 4242")
  const [expiry, setExpiry] = React.useState("12 / 30")
  const [cvc, setCvc] = React.useState("123")

  async function settle(outcome: Outcome, reason?: string) {
    if (pending) return
    setPending(outcome)
    try {
      const res = await fetch(`/api/protected/billing/checkout/${checkoutId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, reason }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        toast.error(payload.error ?? "Something went wrong.")
        setPending(null)
        return
      }
      // Hand off to the payment result (callback) screen.
      router.replace(`/billing/callback/${checkoutId}`)
    } catch {
      toast.error("Network error. Please try again.")
      setPending(null)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => router.push("/billing")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
          Back to billing
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCreditCard className="size-5" />
              Complete your payment
            </CardTitle>
            <CardDescription>
              Upgrade {tenantName} to the {planName} plan.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between rounded-lg border bg-background p-4">
              <div>
                <p className="font-medium">{planName} plan</p>
                <p className="text-sm text-muted-foreground">
                  Billed monthly
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums">
                  R{(amount).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                settle("paid")
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="card">Card number</Label>
                <Input
                  id="card"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={pending !== null}>
                {pending === "paid" ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    Processing payment…
                  </>
                ) : (
                  <>Pay R{(amount).toFixed(2)}</>
                )}
              </Button>
            </form>

            <Separator />

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending !== null}
                onClick={() => settle("failed", "Your card was declined.")}
              >
                {pending === "failed" ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Simulate declined payment"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={pending !== null}
                onClick={() => settle("canceled")}
              >
                Cancel checkout
              </Button>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <IconLock className="size-3.5" />
              Test mode — this is a simulated payment. No card is charged.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
