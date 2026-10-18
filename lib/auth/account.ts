import type { SupabaseClient } from "@supabase/supabase-js";
import { blockedReason, type BlockedReason } from "@/lib/auth/blocked";
import type { Role } from "@/types/auth";

// The one profile read that decides whether a signed-in user may proceed —
// shared by the proxy (lib/supabase/middleware.ts) and the browser login
// (lib/api/auth.ts), so both classify the same row the same way.
export const ACCOUNT_ACCESS_SELECT = "role, status, academy:academies!profiles_academy_id_fkey(status)";

const ROLES: readonly Role[] = ["student", "mentor", "academy_admin", "super_admin"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// "lookup_failed" (the query itself errored — e.g. a column the code expects
// is missing because a migration hasn't run, or the database is unreachable)
// is kept apart from "missing_profile" (the query worked and found no row):
// the first is an outage to retry, the second an account that isn't set up.
export type AccountAccess =
  | { kind: "ok"; role: Role }
  | { kind: "blocked"; reason: BlockedReason }
  | { kind: "missing_profile" }
  | { kind: "unknown_role" }
  | { kind: "lookup_failed"; code: string | null; message: string | null };

export async function loadAccountAccess(supabase: Pick<SupabaseClient, "from">, userId: string): Promise<AccountAccess> {
  const { data, error } = await supabase.from("profiles").select(ACCOUNT_ACCESS_SELECT).eq("id", userId).maybeSingle();

  if (error) return { kind: "lookup_failed", code: error.code ?? null, message: error.message ?? null };
  if (!data) return { kind: "missing_profile" };

  const reason = blockedReason(data);
  if (reason) return { kind: "blocked", reason };

  const role = (data as { role?: unknown }).role;
  if (!isRole(role)) return { kind: "unknown_role" };
  return { kind: "ok", role };
}
