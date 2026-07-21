import {
  IconFiles,
  IconClockPause,
  IconCircleCheck,
  IconArchive,
} from "@tabler/icons-react"

import type { TenantStats } from "@/lib/store"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function DashboardCards({ totalDocuments, minorTotal, stats }: { totalDocuments:number;minorTotal:number; stats: TenantStats["byStatus"] }) {
  const cards = [
    {
      label: "Total documents",
      value: totalDocuments ||0,
      hint: `${minorTotal} added in last 30 days`,
      icon: IconFiles,
    },
    {
      label: "Open items",
      value: (stats["draft"]||0)+(stats["unassigned"]||0),
      hint: "Draft + Unassigned",
      icon: IconClockPause,
    },
    {
      label: "Assigned",
      value: stats["assigned"]||0,
      hint: "Ready to be filed",
      icon: IconCircleCheck,
    },
    {
      label: "Filed / Archived",
      value: (stats["filed"]||0)+(stats["archived"]||0),
      hint: "Completed this period",
      icon: IconArchive,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <card.icon className="size-4" />
              {card.label}
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {card.value}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
