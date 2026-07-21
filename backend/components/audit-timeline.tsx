import * as React from "react"
import {
  IconFilePlus,
  IconArrowRight,
  IconPencil,
  IconHistory,
} from "@tabler/icons-react"

import type { AuditAction, AuditEvent } from "@/lib/types"
import {
  describeAuditEvent,
  formatAuditTimestamp,
  formatRelativeTime,
} from "@/lib/audit"
import { cn } from "@/lib/utils"

const ACTION_ICON: Record<AuditAction, typeof IconFilePlus> = {
  document_created: IconFilePlus,
  status_changed: IconArrowRight,
  document_renamed: IconPencil,
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AuditTimeline({
  events,
  showDocument = true,
  emptyLabel = "No activity yet.",
  className,
}: {
  events: AuditEvent[]
  /** Show the document title on each row (hidden in per-document views). */
  showDocument?: boolean
  emptyLabel?: string
  className?: string
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <IconHistory className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ol className={cn("flex flex-col", className)}>
      {events.map((event, index) => {
        const Icon = ACTION_ICON[event.action] ?? IconHistory
        const isLast = index === events.length - 1
        return (
          <li key={event.id} className="relative flex gap-3">
            {/* Connector line between markers. */}
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute left-4 top-8 bottom-0 w-px -translate-x-1/2 bg-border"
              />
            ) : null}

            <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>

            <div className="flex flex-1 flex-col gap-0.5 pb-6">
              <p className="text-sm text-pretty">
                {describeAuditEvent(event)}
              </p>
              {showDocument ? (
                <p className="text-sm font-medium">{event.documentTitle}</p>
              ) : null}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                  {initials(event.actorName)}
                </span>
                <span>{event.actorName}</span>
                <span aria-hidden="true">·</span>
                <time
                  dateTime={event.createdAt}
                  title={formatAuditTimestamp(event.createdAt)}
                >
                  {formatRelativeTime(event.createdAt)}
                </time>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
