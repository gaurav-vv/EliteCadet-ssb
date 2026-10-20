// Dev-only "preview a role without logging in" helper (AGENTS.md §19: never
// weakens the real auth/authorization model — it only automates signing in
// as a fixed seeded account per role, entirely gated off in production).
//
// The preview accounts are real accounts in whichever Supabase project the
// env points at, including a super admin. So the feature is opt-in
// (DEV_PREVIEW_ENABLED=true) and the password comes from the environment —
// a password committed to the repo would let anyone who reads it log in.
import type { Role } from "@/types/auth";

interface DevPreviewAccount {
  email: string;
  fullName: string;
  academyName?: string;
}

export const DEV_PREVIEW_ACCOUNTS: Record<Role, DevPreviewAccount> = {
  student: { email: "preview.student@ssbacademy.dev", fullName: "Preview Student" },
  mentor: { email: "preview.mentor@ssbacademy.dev", fullName: "Preview Mentor" },
  academy_admin: {
    email: "preview.academy@ssbacademy.dev",
    fullName: "Preview Admin",
    academyName: "Preview Academy",
  },
  super_admin: { email: "preview.superadmin@ssbacademy.dev", fullName: "Preview Super Admin" },
};

export const DEV_PREVIEW_MIN_PASSWORD_LENGTH = 16;

export function isDevPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_PREVIEW_ENABLED === "true";
}

// Names of what's missing or unusable for the preview, never values.
export function devPreviewConfigProblems(): string[] {
  const problems: string[] = [];
  const password = process.env.DEV_PREVIEW_PASSWORD ?? "";
  if (password.length < DEV_PREVIEW_MIN_PASSWORD_LENGTH) {
    problems.push(`DEV_PREVIEW_PASSWORD (unset or shorter than ${DEV_PREVIEW_MIN_PASSWORD_LENGTH} characters)`);
  }
  return problems;
}

export function devPreviewPassword(): string {
  return process.env.DEV_PREVIEW_PASSWORD ?? "";
}
