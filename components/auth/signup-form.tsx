"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterChip } from "@/components/ui/filter-chip";
import { signUp } from "@/lib/api/auth";
import type { Role } from "@/types/auth";

type SignupRole = Extract<Role, "student" | "academy_admin">;

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await signUp({
      email,
      password,
      fullName,
      role,
      academyName: role === "academy_admin" ? academyName : undefined,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    if (result.data?.needsConfirmation) {
      setStatus("confirm");
      return;
    }

    const target = role === "academy_admin" ? "/academy" : "/onboarding";
    router.push(target);
    router.refresh();
  }

  if (status === "confirm") {
    return (
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10 text-center">
        <h1 className="text-xl font-semibold text-ink">Confirm your email</h1>
        <p className="text-sm text-ink-secondary">
          We&apos;ve sent a link to {email}. Open it to activate your account, then you&apos;ll be signed in.
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
        <h1 className="text-xl font-semibold text-ink">Create your account</h1>
        <p className="text-sm text-ink-secondary">Start preparing, or set up your academy.</p>
      </div>

      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center gap-2" role="radiogroup" aria-label="Account type">
        <FilterChip label="I'm a student" selected={role === "student"} onClick={() => setRole("student")} />
        <FilterChip
          label="I run an academy"
          selected={role === "academy_admin"}
          onClick={() => setRole("academy_admin")}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={status === "loading"}
          />
        </div>

        {role === "academy_admin" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="academyName">Academy name</Label>
            <Input
              id="academyName"
              required
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              disabled={status === "loading"}
            />
          </div>
        )}

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
          <Label htmlFor="password">Password</Label>
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
          {status === "loading" ? "Creating account…" : "Create account"}
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
