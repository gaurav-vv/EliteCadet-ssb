// Dev-only "preview a role without logging in" helper (AGENTS.md §19: never
// weakens the real auth/authorization model — it only automates signing in
// as a fixed seeded account per role, entirely gated off in production).
import type { Role } from "@/types/auth";

export const DEV_PREVIEW_PASSWORD = "ssb-dev-preview-2026!";

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
};

export function isDevPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
