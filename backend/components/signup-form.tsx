"use client";

import * as React from "react";
import Link from "next/link";
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
import { SignupSchema } from "@/lib/schema";
import { useAuth } from "@/context/AuthContext";

export function SignupForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [firmName, setFirmName] = React.useState("");
  const [name, setName] = React.useState("");
  const [surname, setSurnameName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const idempotencyKey = crypto.randomUUID();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validatedData = SignupSchema.safeParse({
      firmName,
      name,
      surname,
      email,
      password,
    });
    if (!validatedData.success) {
      setError(validatedData.error.issues[0].message);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { firmName, name, surname, email, password } = validatedData.data;
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          Credentials: "include",
        },
        body: JSON.stringify({ firmName, name, surname, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Unable to create your account.");
        return;
      }
      await refreshUser();
      router.replace("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <IconInnerShadowTop className="size-5" />
          </div>
          <span className="text-base font-semibold">Document Workspace</span>
        </div>
        <CardTitle className="text-xl">Create your firm</CardTitle>
        <CardDescription>
          Set up your workspace. You&apos;ll choose a license in the next step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firmName">Firm name</Label>
            <Input
              id="firmName"
              placeholder="Acme Accounting"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-col md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">First name</Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Jordan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="surname">Last name</Label>
              <Input
                id="surname"
                autoComplete="name"
                placeholder="Jordan"
                value={surname}
                onChange={(e) => setSurnameName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Work email</Label>
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
              autoComplete="new-password"
              placeholder="At least 5 characters"
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
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
      {loading && (
        <div className="fixed top-0 overflow-hidden left-0 w-[100%] h-[100%] flex justify-center items-center bg-black/30 bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-secondary"></div>
        </div>
      )}
    </Card>
  );
}
