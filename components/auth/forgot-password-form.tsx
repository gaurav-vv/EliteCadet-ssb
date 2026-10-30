"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Toast } from "@/components/academy/shared/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LocalMailboxNote } from "@/components/auth/local-mailbox-note";
import { requestPasswordReset } from "@/lib/api/auth";
import { validateEmail } from "@/lib/auth/validation";

const REASON_MESSAGES: Record<string, string> = {
  link_invalid: "That reset link is invalid, expired or already used. Request a new one below.",
};

export const RESET_SENT_TOAST = "If that email is registered, a reset link is on its way.";
const TOAST_MS = 7000;

export function ForgotPasswordForm({ reason }: { reason?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  // A ref, not state: a second click in the same tick must not send a second email.
  const submitting = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setErrorMessage(null);

    // A quick answer next to the field. requestPasswordReset checks again before anything is sent.
    const invalid = validateEmail(email);
    if (invalid) {
      setEmailError(invalid);
      setStatus("idle");
      document.getElementById("email")?.focus();
      return;
    }
    setEmailError(null);

    submitting.current = true;
    setStatus("loading");
    try {
      const result = await requestPasswordReset(email.trim());

      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      // Only after Supabase accepted the request. The wording never says whether the address has an account.
      setStatus("sent");
      setToast(true);
    } finally {
      submitting.current = false;
    }
  }

  if (status === "sent") {
    return (
      <>
        <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10 text-center">
          <h1 className="text-xl font-semibold text-ink">Check your email</h1>
          <p className="text-sm text-ink-secondary">
            If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password. The link works once and expires after an hour.
          </p>
          <LocalMailboxNote />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
        {toast && <Toast message={RESET_SENT_TOAST} tone="success" onDismiss={() => setToast(false)} />}
      </>
    );
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-ink">Reset your password</h1>
        <p className="text-sm text-ink-secondary">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      {reason && REASON_MESSAGES[reason] && status !== "error" && (
        <Alert>
          <AlertDescription>{REASON_MESSAGES[reason]}</AlertDescription>
        </Alert>
      )}

      {status === "error" && errorMessage && (
        <Alert variant="destructive" role="alert">
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
            aria-required="true"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            disabled={status === "loading"}
          />
          {emailError && (
            <p id="email-error" role="alert" className="text-[12px] text-danger">
              {emailError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={status === "loading"} aria-busy={status === "loading"}>
          {status === "loading" ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-secondary">
        Remembered it?{" "}
        <Link href="/login" className="text-brand-accent hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
