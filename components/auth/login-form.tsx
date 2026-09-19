"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logIn } from "@/lib/api/auth";
import { dashboardPathForRole } from "@/lib/auth/redirect";

const REASON_MESSAGES: Record<string, string> = {
  login_required: "Please log in to continue.",
  link_invalid: "That link is invalid or has expired. Please log in again.",
  password_updated: "Your password has been updated. Please log in.",
};

interface LoginFormProps {
  redirectTo?: string;
  reason?: string;
}

export function LoginForm({ redirectTo, reason }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await logIn({ email, password });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : dashboardPathForRole(result.data!.role);
    router.push(target);
    router.refresh();
  }

  return (
    <div className="glass-surface flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Welcome back</h1>
        <p className="text-sm text-text-muted">Log in to continue your preparation.</p>
      </div>

      {reason && REASON_MESSAGES[reason] && (
        <Alert>
          <AlertDescription>{REASON_MESSAGES[reason]}</AlertDescription>
        </Alert>
      )}

      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-text-muted hover:text-brand-navy">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === "loading"}
          />
        </div>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-brand-navy hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
