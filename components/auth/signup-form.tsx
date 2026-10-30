"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterChip } from "@/components/ui/filter-chip";
import { signUp } from "@/lib/api/auth";
import { validateSignupInput } from "@/lib/auth/validation";
import { setFlash } from "@/lib/flash";
import type { Role } from "@/types/auth";

type SignupRole = Extract<Role, "student" | "academy_admin">;
type FieldName = "fullName" | "academyName" | "email" | "password";

export const SIGNUP_SUCCESS_MESSAGE = "Your account has been created successfully!";
export const PASSWORD_HINT = "At least 8 characters.";

// Order the fields appear in, so the first invalid one gets the focus.
const FIELD_ORDER: FieldName[] = ["fullName", "academyName", "email", "password"];

// initialRole only preselects the toggle (e.g. /signup?as=academy from the
// landing page); the server still decides the role (0005 handle_new_user).
export function SignupForm({ initialRole = "student" }: { initialRole?: SignupRole } = {}) {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "confirm">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  // A ref, not state: a second click in the same tick must not start a second sign-up.
  const submitting = useRef(false);

  function clearError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function focusFirst(errors: Partial<Record<FieldName, string>>) {
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) document.getElementById(first)?.focus();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setErrorMessage(null);

    const input = { email: email.trim(), password, fullName: fullName.trim(), role, academyName: role === "academy_admin" ? academyName.trim() : undefined };
    // Checked here for a quick, specific answer; Supabase Auth and the database enforce their own rules
    // again, and anything they refuse comes back below.
    const problems = validateSignupInput(input) as Partial<Record<FieldName, string>>;
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems);
      setStatus("idle");
      focusFirst(problems);
      return;
    }
    setFieldErrors({});

    submitting.current = true;
    setStatus("loading");
    try {
      const result = await signUp(input);

      if (!result.ok) {
        const code = result.error?.code;
        const message = result.error?.message ?? "Something went wrong. Please try again.";
        setStatus("error");
        if (code === "email_in_use") {
          setFieldErrors({ email: message });
          focusFirst({ email: message });
        } else if (code === "weak_password") {
          const weak = `${message} Use at least 8 characters, and avoid common passwords.`;
          setFieldErrors({ password: weak });
          focusFirst({ password: weak });
        } else {
          setErrorMessage(message);
        }
        return;
      }

      if (result.data?.needsConfirmation) {
        setStatus("confirm");
        return;
      }

      // Only now, after the account really exists: tell the user on the next screen.
      setFlash(SIGNUP_SUCCESS_MESSAGE);
      router.push(role === "academy_admin" ? "/academy" : "/onboarding");
      router.refresh();
    } finally {
      submitting.current = false;
    }
  }

  const loading = status === "loading";

  if (status === "confirm") {
    return (
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10 text-center">
        <Alert role="status">
          <AlertDescription>{SIGNUP_SUCCESS_MESSAGE}</AlertDescription>
        </Alert>
        <h1 className="text-xl font-semibold text-ink">Confirm your email</h1>
        <p className="text-sm text-ink-secondary">
          We&apos;ve sent a link to {email.trim()}. Open it to activate your account, then you&apos;ll be signed in. Nothing else to do until you confirm it. If you don&apos;t see it, check your spam folder.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  const describedBy = (field: FieldName, extra?: string) => [fieldErrors[field] ? `${field}-error` : null, extra].filter(Boolean).join(" ") || undefined;
  const error = (field: FieldName) =>
    fieldErrors[field] ? (
      <p id={`${field}-error`} role="alert" className="text-[12px] text-danger">
        {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-ink">Create your account</h1>
        <p className="text-sm text-ink-secondary">Start preparing, or set up your academy.</p>
        <p className="text-[12px] text-ink-secondary">Fields marked * are required.</p>
      </div>

      {status === "error" && errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center gap-2" role="radiogroup" aria-label="Account type">
        <FilterChip label="I'm a student" selected={role === "student"} onClick={() => setRole("student")} />
        <FilterChip label="I run an academy" selected={role === "academy_admin"} onClick={() => setRole("academy_admin")} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name *</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            aria-required="true"
            aria-invalid={fieldErrors.fullName ? true : undefined}
            aria-describedby={describedBy("fullName")}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearError("fullName");
            }}
            disabled={loading}
          />
          {error("fullName")}
        </div>

        {role === "academy_admin" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="academyName">Academy name *</Label>
            <Input
              id="academyName"
              required
              aria-required="true"
              aria-invalid={fieldErrors.academyName ? true : undefined}
              aria-describedby={describedBy("academyName")}
              value={academyName}
              onChange={(e) => {
                setAcademyName(e.target.value);
                clearError("academyName");
              }}
              disabled={loading}
            />
            {error("academyName")}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            disabled={loading}
          />
          {error("email")}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={describedBy("password", "password-hint")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            disabled={loading}
          />
          <p id="password-hint" className="text-[12px] text-ink-secondary">
            {PASSWORD_HINT}
          </p>
          {error("password")}
        </div>

        <Button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
