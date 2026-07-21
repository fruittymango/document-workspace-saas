import Link from "next/link"
import {
  IconCreditCard,
  IconUsers,
  IconFiles,
  IconArrowUpRight,
} from "@tabler/icons-react"
import type { TenantBilling } from "@/lib/types"
import {
  getPlan,
} from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { isAtLimit,utilization } from "@/lib/utils"

function limitLabel(limit: number | null) {
  return limit === null ? "Unlimited" : limit.toLocaleString()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}


export function DashboardBilling({ billing }: { billing: TenantBilling }) {
  const seatPct = utilization(billing.seatsUsed, billing.seatLimit)
  const docPct = utilization(billing.documentsUsed, billing.documentLimit)
  const nearSeatLimit = seatPct >= 80 || isAtLimit(billing.seatsUsed, billing.seatLimit)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCreditCard className="size-4" />
          Licensing
        </CardTitle>
        <CardDescription>Plan, usage, and recurring revenue</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link href="/billing">
              Manage
              <IconArrowUpRight className="size-4" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              Current plan
            </span>
            <span className="flex items-center gap-2 text-xl font-semibold">
              {billing.plan}
              {nearSeatLimit ? (
                <Badge variant="secondary">Near seat limit</Badge>
              ) : (
                <Badge variant="secondary">Active</Badge>
              )}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums">
              R{(billing.priceCents||0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              monthly recurring &middot; renews {formatDate(billing.renewsAt)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <IconUsers className="size-4" />
                Seats
              </span>
              <span className="font-medium tabular-nums">
                {billing.seatsUsed} / {limitLabel(billing.seatLimit)}
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
                {billing.documentsUsed} / {limitLabel(billing.documentLimit)}
              </span>
            </div>
            <Progress value={docPct} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
