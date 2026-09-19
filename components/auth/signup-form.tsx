"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CapsuleSmall } from "@/components/ui/capsule";
import { signUp } from "@/lib/api/auth";
import type { Role } from "@/types/auth";

type SignupRole = Extract<Role, "student" | "academy_admin">;

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("student");
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
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

    const target = role === "academy_admin" ? "/academy" : "/onboarding";
    router.push(target);
    router.refresh();
  }

  return (
    <div className="glass-surface flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Create your account</h1>
        <p className="text-sm text-text-muted">Start preparing, or set up your academy.</p>
      </div>

      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center gap-2" role="radiogroup" aria-label="Account type">
        <CapsuleSmall
          icon="student"
          label="I'm a student"
          selected={role === "student"}
          onClick={() => setRole("student")}
          aria-checked={role === "student"}
          role="radio"
        />
        <CapsuleSmall
          icon="academy"
          label="I run an academy"
          selected={role === "academy_admin"}
          onClick={() => setRole("academy_admin")}
          aria-checked={role === "academy_admin"}
          role="radio"
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

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-navy hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
