"use client";

import * as React from "react";
import useSWR from "swr";
import {
  IconChevronDown,
  IconFilePlus,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import { toast } from "sonner";

import type { DocumentRecord } from "@/lib/types";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { documentsFetcher, documentStatusFetcher } from "@/lib/api";
import { formatDate, STATUS_VARIANT } from "@/lib/utils";
import { DocumentSchema } from "@/lib/schema";
import { DocumentStatus } from "@/prisma/generated/browser";

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function DocumentsView() {
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [statuses, setStatuses] = React.useState<DocumentStatus[]>();
  const [creating, setCreating] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const debouncedSearch = useDebounced(search);
  const key = `/api/protected/documents?search=${encodeURIComponent(debouncedSearch)}`;
  const { data, isLoading, mutate } = useSWR(key, documentsFetcher, {});
  const draftStatusId = React.useRef<string>("");

  const documents = data?.documents ?? [];

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const validatedData = DocumentSchema.safeParse({
      title,
      statusId: draftStatusId.current,
    });
    if (!validatedData.success) {
      toast.error(validatedData.error.issues[0].message);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/protected/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Credentials: "include",
        },
        body: JSON.stringify({
          title,
          statusId: draftStatusId.current,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error ?? "Could not create document.");
        return;
      }
      toast.success("Document created.");
      setTitle("");
      setCreateOpen(false);
      mutate();
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(doc: DocumentRecord, status: DocumentStatus) {
    setPendingId(doc.id);
    try {
      const res = await fetch(`/api/protected/documents/${doc.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Credentials: "include" },
        body: JSON.stringify({ statusId: status.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error ?? "Could not update status.");
        return;
      }
      toast.success(`Moved to ${STATUS_LABELS[status.status]}.`);
      mutate();
    } catch (err) {
    } finally {
      setPendingId(null);
    }
  }

  React.useEffect(() => {
    documentStatusFetcher("/api/protected/documents/status").then((result) => {
      if (result) {
        setStatuses(result.statuses);
        draftStatusId.current =
          result.statuses?.find((s, i) => s.status.toLowerCase() === "draft")
            ?.id || "";
      }
    });
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base font-medium">Documents</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {user && user.tenant}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search documents by title"
            />
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <IconFilePlus className="size-4" />
                New document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create document</DialogTitle>
                  <DialogDescription>
                    New documents start in the Draft status.
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4 flex flex-col gap-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q4 Financial Statements"
                    maxLength={120}
                    autoFocus
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !title.trim()}>
                    {creating ? (
                      <>
                        <IconLoader2 className="size-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-32">Created</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading…"
                      : debouncedSearch
                        ? "No documents match your search."
                        : "No documents yet. Create your first one."}
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => {
                  const transitions = statuses?.filter((s, i) =>
                    STATUS_TRANSITIONS[doc.status.status].includes(
                      s.status.toLowerCase(),
                    ),
                  );
                  const busy = pendingId === doc.id;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-[400]">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[doc.status.status]}>
                          {STATUS_LABELS[doc.status.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                busy ||
                                (transitions && transitions?.length === 0)
                              }
                            >
                              {busy ? (
                                <IconLoader2 className="size-4 animate-spin" />
                              ) : (
                                <>
                                  Change
                                  <IconChevronDown className="size-4" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Move to</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {transitions?.map((next) => (
                              <DropdownMenuItem
                                key={next.id}
                                onSelect={() => changeStatus(doc, next)}
                              >
                                {STATUS_LABELS[next.status]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center flex-wrap">
          <p className="text-xs text-muted-foreground">
            Showing {data && data.meta?.totalCount} document
            {data && data.meta?.totalCount === 1 ? "" : "s"} for{" "}
            {user && user.tenant}.
          </p>

          <p className="text-xs text-muted-foreground">
            Page: {data && data.meta?.currentPage} of{" "}
            {data && data.meta?.totalPages}{" "}
            <span className="inline-block">
              Limit: {data && data.meta?.limit}
            </span>
          </p>
        </div>
      </div>
      {((!data && isLoading) || creating || pendingId) && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </div>
  );
}
