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

// What a failed profile query leaves behind for the logs: the Postgres /
// PostgREST code, the HTTP status and a sanitized message. Never shown to users.
export type LookupFailure = { code: string | null; message: string | null; status: number | null };

// "lookup_failed" (the query itself errored — e.g. a column the code expects
// is missing because a migration hasn't run, or the database is unreachable)
// is kept apart from "missing_profile" (the query worked and found no row):
// the first is an outage to retry, the second an account that isn't set up.
export type AccountAccess =
  | { kind: "ok"; role: Role }
  | { kind: "blocked"; reason: BlockedReason }
  | { kind: "missing_profile" }
  | { kind: "unknown_role" }
  | ({ kind: "lookup_failed" } & LookupFailure);

// Postgres/PostgREST messages can quote values from the request (e.g.
// `invalid input syntax for type uuid: "…"`), so ids, emails and tokens are
// masked and the length capped before anything reaches a log.
export function sanitizeDbMessage(message: unknown): string | null {
  if (typeof message !== "string" || !message) return null;
  return message
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<token>")
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g, "<email>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .slice(0, 300);
}

export function lookupFailure(error: { code?: unknown; message?: unknown } | null | undefined, status?: number | null): LookupFailure {
  return {
    code: typeof error?.code === "string" && error.code ? error.code : null,
    message: sanitizeDbMessage(error?.message),
    status: typeof status === "number" && status > 0 ? status : null,
  };
}

// Undefined column / table / relationship: the database is behind the code.
const SCHEMA_MISMATCH_CODES = new Set(["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"]);

// One line of text, not an object: Next.js 16's dev overlay and its
// browser-to-terminal log forwarding render every plain-object console
// argument as "{}", which is how this failure used to show no detail at all.
export function describeLookupFailure(stage: string, failure: LookupFailure): string {
  const parts = [
    `stage=${stage}`,
    "relation=profiles",
    `code=${failure.code ?? "none"}`,
    `status=${failure.status ?? "none"}`,
    `message=${JSON.stringify(failure.message ?? "")}`,
  ];
  if (failure.code && SCHEMA_MISMATCH_CODES.has(failure.code)) {
    parts.push("hint=the database schema is behind the app; apply the pending supabase/migrations to the project NEXT_PUBLIC_SUPABASE_URL points at");
  }
  return parts.join(" ");
}

export async function loadAccountAccess(supabase: Pick<SupabaseClient, "from">, userId: string): Promise<AccountAccess> {
  const { data, error, status } = await supabase.from("profiles").select(ACCOUNT_ACCESS_SELECT).eq("id", userId).maybeSingle();

  if (error) return { kind: "lookup_failed", ...lookupFailure(error, status) };
  if (!data) return { kind: "missing_profile" };

  const reason = blockedReason(data);
  if (reason) return { kind: "blocked", reason };

  const role = (data as { role?: unknown }).role;
  if (!isRole(role)) return { kind: "unknown_role" };
  return { kind: "ok", role };
}
