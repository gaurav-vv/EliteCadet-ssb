"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset } from "@/lib/api/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await requestPasswordReset(email);

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10 text-center">
        <h1 className="text-xl font-semibold text-ink">Check your email</h1>
        <p className="text-sm text-ink-secondary">
          If an account exists for {email}, we&apos;ve sent a link to reset your password.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-ink">Reset your password</h1>
        <p className="text-sm text-ink-secondary">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

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
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}
