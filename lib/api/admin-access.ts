// Read path for the Access page — REAL Supabase data
// (supabase/migrations/0004_admin_access.sql). admin_list_grants() is
// SECURITY DEFINER and rejects anyone who is not a super admin, so this is
// safe to call as the signed-in user's own session (no service-role key).

import { isAdminArea } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import type { AdminGrant } from "@/types/admin";

export interface AdminApiError {
  code: "unauthorized" | "not_set_up" | "server_error";
  message: string;
}

export interface AdminApiResult<T> {
  ok: boolean;
  data?: T;
  error?: AdminApiError;
}

export const ADMIN_NOT_SET_UP_MESSAGE =
  "Admin access isn't set up in your database yet. Run supabase/migrations/0004_admin_access.sql in the Supabase SQL Editor, then reload.";

export function toAdminApiError(error: { code?: string }): AdminApiError {
  // PGRST202 = function not found in the schema cache, 42883 = undefined function.
  if (error.code === "PGRST202" || error.code === "PGRST205" || error.code === "42883" || error.code === "42P01") {
    return { code: "not_set_up", message: ADMIN_NOT_SET_UP_MESSAGE };
  }
  if (error.code === "42501") return { code: "unauthorized", message: "Only a super admin can manage access." };
  return { code: "server_error", message: "We couldn't load access settings. Please try again." };
}

// External data is validated at the boundary (AGENTS.md §9): a malformed row
// is dropped rather than rendered half-broken.
export function toAdminGrant(row: unknown): AdminGrant | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.user_id !== "string" || typeof r.email !== "string" || typeof r.created_at !== "string" || !isAdminArea(r.area)) {
    return null;
  }
  return {
    userId: r.user_id,
    email: r.email,
    fullName: typeof r.full_name === "string" ? r.full_name : "",
    area: r.area,
    createdAt: r.created_at,
  };
}

export async function listAdminGrants(): Promise<AdminApiResult<AdminGrant[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_grants");
  if (error) return { ok: false, error: toAdminApiError(error) };
  const grants = ((data as unknown[] | null) ?? []).map(toAdminGrant).filter((g): g is AdminGrant => g !== null);
  return { ok: true, data: grants };
}
