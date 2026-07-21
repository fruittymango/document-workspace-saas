"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import type { TenantStats } from "@/lib/store"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useSWR from "swr"

const chartConfig = {
  created: {
    label: "Created",
    color: "var(--chart-1)",
  },
  updated: {
    label: "Updated",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function DashboardChart({
  activity,
  range, setRange
}: {
  range:"30d" | "14d" | "7d";
  setRange:(value:"30d" | "14d" | "7d")=>void;
  activity: TenantStats["activity"]
}) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document activity</CardTitle>
        <CardDescription>
          Documents created and updated over time
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) =>
              value && setRange(value as typeof range)
            }
            variant="outline"
            className="hidden md:flex"
          >
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="14d">Last 14 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={range}
            onValueChange={(value) => setRange(value as typeof range)}
          >
            <SelectTrigger
              className="flex w-36 md:hidden"
              aria-label="Select a time range"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <div className="px-2 pb-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={activity}>
            <defs>
              <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-created)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-created)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillUpdated" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-updated)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-updated)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="updated"
              type="natural"
              fill="url(#fillUpdated)"
              stroke="var(--color-updated)"
              stackId="a"
            />
            <Area
              dataKey="created"
              type="natural"
              fill="url(#fillCreated)"
              stroke="var(--color-created)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </Card>
  )
}
