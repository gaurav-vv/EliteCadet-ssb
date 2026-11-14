"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { establishRecoverySession, logIn, pendingInviteEmail, updatePassword } from "@/lib/api/auth";
import { postLoginPath } from "@/lib/auth/redirect";
import { validateNewPasswordForm } from "@/lib/auth/validation";
import { setFlash } from "@/lib/flash";

export const PASSWORD_UPDATED_MESSAGE = "Your password has been updated successfully.";

type FieldErrors = { password?: string; confirm?: string };

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [link, setLink] = useState<"checking" | "ready" | "invalid">("checking");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // A ref, not state: a second click in the same tick must not submit twice.
  const submitting = useRef(false);

  // Nothing can be changed until the page has a real recovery session: the link is turned into one (and
  // verified by Supabase) here, and only a session that came from a reset or invite email counts.
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
    if (submitting.current) return;
    setErrorMessage(null);

    const problems = validateNewPasswordForm({ password, confirm });
    if (problems.password || problems.confirm) {
      setFieldErrors(problems);
      setStatus("idle");
      document.getElementById(problems.password ? "password" : "confirm-password")?.focus();
      return;
    }
    setFieldErrors({});

    submitting.current = true;
    setStatus("loading");
    try {
      const inviteEmail = await pendingInviteEmail();
      const result = await updatePassword(password);

      if (!result.ok) {
        const code = result.error?.code;
        const message = result.error?.message ?? "Something went wrong. Please try again.";
        if (code === "link_expired") {
          setLink("invalid");
          return;
        }
        setStatus("error");
        if (code === "weak_password" || code === "same_password" || code === "validation_error") {
          setFieldErrors({ password: code === "weak_password" ? `${message} Use at least 6 characters, and avoid common passwords.` : message });
          document.getElementById("password")?.focus();
        } else {
          setErrorMessage(message);
        }
        return;
      }

      // An invited person (e.g. a mentor) goes straight to their dashboard: log them in with the password they just
      // chose, through the same checks as the login page. If that fails they simply log in by hand.
      if (inviteEmail) {
        const signedIn = await logIn({ email: inviteEmail, password });
        if (signedIn.ok && signedIn.data) {
          router.push(postLoginPath(signedIn.data.role, null));
          return;
        }
      }

      // Only now that Supabase has changed the password: say so on the login page, where we are going.
      setFlash(PASSWORD_UPDATED_MESSAGE);
      router.push("/login?reason=password_updated");
    } finally {
      submitting.current = false;
    }
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
        <h1 className="text-xl font-semibold text-ink">This link has expired or was already used</h1>
        <p className="text-sm text-ink-secondary">
          Reset and invite links work once and expire after an hour, and only the newest reset link works. If you opened this page without a link, there is nothing to reset here. Request a new link and open it from the newest email. If it still fails, open it in the same browser where you asked for it. For an invite, ask whoever invited you to send it again.
        </p>
        <Button asChild size="sm">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <Link href="/login" className="text-sm text-brand-accent hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-ink">Set a new password</h1>
        <p className="text-sm text-ink-secondary">Choose a password you don&apos;t use anywhere else.</p>
      </div>

      {status === "error" && errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={["password-hint", fieldErrors.password ? "password-error" : null].filter(Boolean).join(" ")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            disabled={loading}
          />
          <p id="password-hint" className="text-[12px] text-ink-secondary">
            At least 6 characters.
          </p>
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="text-[12px] text-danger">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={fieldErrors.confirm ? true : undefined}
            aria-describedby={fieldErrors.confirm ? "confirm-error" : undefined}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fieldErrors.confirm) setFieldErrors((f) => ({ ...f, confirm: undefined }));
            }}
            disabled={loading}
          />
          {fieldErrors.confirm && (
            <p id="confirm-error" role="alert" className="text-[12px] text-danger">
              {fieldErrors.confirm}
            </p>
          )}
        </div>

        <Button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
