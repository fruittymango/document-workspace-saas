"use client";

import * as React from "react";
import useSWR from "swr";
import {
  IconDotsVertical,
  IconLoader2,
  IconShieldLock,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { toast } from "sonner";
import type { TenantUser, UserRole } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { planFetcher, usersFetcher } from "@/lib/api";
import { Plan } from "@/prisma/generated/client";
import { initials, ROLE_LABELS } from "@/lib/utils";

export function UsersView() {
  const { user } = useAuth();
  const { data, mutate, isLoading } = useSWR(
    "/api/protected/users",
    usersFetcher,
    {
      keepPreviousData: true,
    },
  );
  const users = data?.users ?? [];
  const [plan, setPlan] = React.useState<Plan>();
  const seatLimit = plan?.seatLimit || 0;
  const atCapacity = seatLimit !== null && users.length >= seatLimit;

  // Create dialog state.
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [surname, setSurname] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(user?.role_code as UserRole);
  const [creating, setCreating] = React.useState(false);

  // Row-level busy + delete confirmation state.
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toRemove, setToRemove] = React.useState<TenantUser | null>(null);
  const [removing, setRemoving] = React.useState(false);

  function resetCreateForm() {
    setName("");
    setSurname("");
    setEmail("");
    setPassword("");
    setRole("member");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/protected/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, email, password, role }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Could not add user.");
        return;
      }
      toast.success(`${payload.user.name} was added.`);
      resetCreateForm();
      setCreateOpen(false);
      mutate();
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(target: TenantUser, nextRole: UserRole) {
    if (target.role === nextRole) return;
    setPendingId(target.id);
    try {
      const res = await fetch(`/api/protected/users/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error ?? "Could not update role.");
        return;
      }
      toast.success(`${target.name} is now ${ROLE_LABELS[nextRole]}.`);
      mutate();
    } finally {
      setPendingId(null);
    }
  }

  async function confirmRemove() {
    if (!toRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/protected/users/${toRemove.id}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error ?? "Could not remove user.");
        return;
      }
      toast.success(`${toRemove.name} was removed.`);
      setToRemove(null);
      mutate();
    } finally {
      setRemoving(false);
    }
  }

  React.useEffect(() => {
    planFetcher("/api/protected/billing/plan").then((result) => {
      if (result && result.licensePlan) {
        setPlan(result.licensePlan.plan);
      }
    });
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base font-medium">Users</h1>
        <span className="ml-auto text-sm text-muted-foreground">
          {user && user.tenant}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconUsers className="size-4" />
            <span>
              {users.length}
              {seatLimit !== null ? ` of ${seatLimit}` : ""} seat
              {users.length === 1 ? "" : "s"} used on the {plan?.name} plan
            </span>
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetCreateForm();
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={atCapacity}>
                <IconUserPlus className="size-4" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Add a user</DialogTitle>
                  <DialogDescription>
                    Invite a member of {user && user.tenant}. They can sign in
                    with the email and temporary password you set here.
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4 flex flex-col gap-4">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex flex-col gap-2 flex-1">
                      <Label htmlFor="user-name">First name</Label>
                      <Input
                        id="user-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jordan"
                        maxLength={80}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <Label htmlFor="user-surname">Last Name</Label>
                      <Input
                        id="user-surname"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="e.g. Lee"
                        maxLength={80}
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@firm.com"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-password">Temporary password</Label>
                    <Input
                      id="user-password"
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="user-role">Role</Label>
                    <Select
                      value={role}
                      onValueChange={(value) => setRole(value as UserRole)}
                    >
                      <SelectTrigger id="user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          Member — documents only
                        </SelectItem>
                        <SelectItem value="admin">
                          Admin — full access incl. billing
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      creating ||
                      !name.trim() ||
                      !email.trim() ||
                      password.length < 8
                    }
                  >
                    {creating ? (
                      <>
                        <IconLoader2 className="size-4 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      "Add user"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {atCapacity ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            <IconShieldLock className="size-4" />
            <span>
              You have used all {seatLimit} seats on the {plan?.name} plan.
              Upgrade your plan to add more members.
            </span>
          </div>
        ) : null}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32">Role</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((member) => {
                const busy = pendingId === member.id;
                const isSelf = user && user.id === member.id;
                const role =
                  member?.userRoles && member?.userRoles[0].role.code;
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-lg">
                          <AvatarFallback className="rounded-lg text-xs">
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {member.name}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          role === "admin" || role === "owner"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ROLE_LABELS[role as UserRole]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={busy}
                            aria-label={`Manage ${member.name}`}
                          >
                            {busy ? (
                              <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                              <IconDotsVertical className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change role</DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={
                              member.role === "admin" || member.role === "owner"
                            }
                            onSelect={() => changeRole(member, "admin")}
                          >
                            Make admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={member.role === "member" || isSelf}
                            onSelect={() => changeRole(member, "member")}
                          >
                            Make member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={isSelf}
                            onSelect={() => setToRemove(member)}
                          >
                            <IconTrash className="size-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Admins can manage users and billing. Members can only work with
          documents.
        </p>
      </div>

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove
                ? `${toRemove.name} will lose access to ${user && user.tenant} immediately. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmRemove();
              }}
              disabled={removing}
            >
              {removing ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {((!data && isLoading) || creating || removing) && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </div>
  );
}
