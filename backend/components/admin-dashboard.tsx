import { STATUS_LABELS } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardCards } from "@/components/dashboard-cards";
import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardBilling } from "@/components/dashboard-billing";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { Button } from "./ui/button";
import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";
import React from "react";
import { statsFetcher } from "@/lib/api";
import { formatDateTime, STATUS_VARIANT } from "@/lib/utils";

export function AdminDashboard() {
  const { user } = useAuth();
  const [range, setRange] = React.useState<"30d" | "14d" | "7d">("30d");
  const key = `/api/protected/admin/stats?days=` + +range.replace("d", "");
  const { data, isLoading } = useSWR(key, statsFetcher, {
    keepPreviousData: true,
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base font-medium">Dashboard</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {(user && user.tenant) || ""}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        {data && (
          <>
            <DashboardCards
              totalDocuments={data.stats.totalDocuments}
              minorTotal={data.stats.minorTotal}
              stats={data?.stats.statusCounts}
            />
            <DashboardChart
              range={range}
              setRange={setRange}
              activity={data.stats.timeline}
            />
          </>
        )}

        {data?.stats.billing && (
          <div className="grid grid-cols-1 gap-4 ">
            <DashboardBilling billing={data?.stats.billing} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <Card>
            <CardHeader className="flex justify-between flex-wrap">
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Most recently updated documents</CardDescription>

              <CardAction>
                <Button asChild variant="outline" size="sm">
                  <Link href="/documents">
                    View All
                    <IconArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-32 text-right">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data && data.stats.latestUpdatedDocument ? (
                      data.stats.latestUpdatedDocument?.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {doc.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[doc.status.status]}>
                              {STATUS_LABELS[doc.status.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatDateTime(doc.updatedAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-sm text-muted-foreground"
                        >
                          No documents yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {isLoading && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </div>
  );
}
