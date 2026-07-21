"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconInnerShadowTop, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { demoFirms, demoUsers } from "@/lib/utils";
import { AuthSchema } from "@/lib/schema";
import { useAuth } from "@/context/AuthContext";

export function LoginForm() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validatedData = AuthSchema.safeParse({ email, password });
    if (!validatedData.success) {
      setError(validatedData.error.issues[0].message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { email, password } = validatedData.data;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Unable to sign in.");
        return;
      }
      await refreshUser();
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function useDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("octro@123");
    setError(null);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <IconInnerShadowTop className="size-5" />
          </div>
          <span className="text-base font-semibold">Document Workspace</span>
        </div>
        <CardTitle className="text-xl">Sign in to your firm</CardTitle>
        <CardDescription>
          Enter your credentials to access your firm&apos;s documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Document Workspace?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create a firm
          </Link>
        </p>

        <div className="mt-6 rounded-md border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Demo accounts (password: octro123)
          </p>
          <div className="flex flex-col gap-1.5">
            {demoUsers?.map((account, index) => {
              if (index > 1) {
                return;
              }
              const firms = demoFirms?.filter((value, ind) => {
                return value?.name
                  .toLowerCase()
                  .includes(account.email.split("@")[1].split(".")[0]);
              });

              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => useDemo(account.email)}
                  className="flex items-center justify-between rounded px-2 py-1 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="text-muted-foreground">
                    {firms && firms?.length ? firms[0].name : "N/A"}
                  </span>
                  <span className="font-mono text-xs">{account.email}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
      {loading && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </Card>
  );
}
