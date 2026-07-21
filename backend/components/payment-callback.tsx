import Link from "next/link"
import {
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react"

import type { CheckoutStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function PaymentCallback({
  status,
  planName,
  amount,
  failureReason,
  renewsAt,
}: {
  status: CheckoutStatus
  planName: string
  amount: number
  failureReason?: string
  renewsAt?: string
}) {
  const success = {
    icon: <IconCircleCheck className="size-14 text-primary" />,
    title: "Payment successful",
    description: `Your firm is now on the ${planName} plan.`,
  }
  const failed = {
    icon: <IconCircleX className="size-14 text-destructive" />,
    title: "Payment unsuccessful",
    description: failureReason ?? "Your payment could not be processed.",
  }
  const canceled = {
    icon: <IconInfoCircle className="size-14 text-muted-foreground" />,
    title: "Checkout canceled",
    description: "No changes were made to your plan.",
  }

  const view =
    status === 'complete' ? success : status === "failed" ? failed : canceled

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mx-auto w-max-md mb-2 flex size-20 items-center justify-center rounded-full bg-muted">
            {view.icon}
          </div>
          <CardTitle className="text-2xl text-balance">{view.title}</CardTitle>
          <CardDescription className="text-pretty">
            {view.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {status === "cancelled" ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-background p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium tabular-nums">
                  R{(amount||0).toFixed(2)} / month
                </span>
              </div>
              {renewsAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next renewal</span>
                  <span className="font-medium">{formatDate(renewsAt)}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {status === "complete" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/billing">Go to billing</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">View dashboard</Link>
                </Button>
              </>
            ) : status === "failed" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/billing">Try again</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full">
                  <Link href="/billing">Return to billing</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
