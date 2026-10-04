// Shared by every real-database Academy data layer (batches, students, ...).
// Server-only in practice: it reads the signed-in user's session cookie.

import { getCurrentUserAndProfile } from "@/lib/auth/session";

export interface DbError {
  code: "unauthorized" | "not_found" | "not_set_up" | "server_error";
  message: string;
}

export interface DbResult<T> {
  ok: boolean;
  data?: T;
  error?: DbError;
}

export const UNAUTHORIZED: DbError = {
  code: "unauthorized",
  message: "You need to be signed in as an academy admin to view this page.",
};

// The academy the signed-in user administers, or null if they are not an
// academy admin. This (never a value from the browser) is where every query's
// academy_id comes from; RLS then enforces the same rule inside Postgres.
export async function getAdminContext(): Promise<{ academyId: string } | null> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile || profile.role !== "academy_admin" || !profile.academyId) return null;
  return { academyId: profile.academyId };
}
