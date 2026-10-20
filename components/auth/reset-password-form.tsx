"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { establishRecoverySession, updatePassword } from "@/lib/api/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [link, setLink] = useState<"checking" | "ready" | "invalid">("checking");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    establishRecoverySession()
      .then((result) => {
        if (!cancelled) setLink(result);
      })
      .catch(() => {
        if (!cancelled) setLink("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await updatePassword(password);

    if (!result.ok) {
      if (result.error?.code === "link_expired") {
        setLink("invalid");
        return;
      }
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/login?reason=password_updated");
  }

  if (link === "checking") {
    return (
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10 text-center" role="status">
        <h1 className="text-xl font-semibold text-ink">Checking your reset link…</h1>
      </div>
    );
  }

  if (link === "invalid") {
    return (
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10 text-center">
        <h1 className="text-xl font-semibold text-ink">This reset link has expired</h1>
        <p className="text-sm text-ink-secondary">
          Reset links work once and expire after a while. Request a new one, then open it in this same browser.
        </p>
        <Button asChild size="sm">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-ink">Set a new password</h1>
      </div>

      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === "loading"}
          />
        </div>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
