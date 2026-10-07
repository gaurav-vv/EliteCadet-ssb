"use server";

// Grant / revoke admin access — REAL Supabase writes
// (supabase/migrations/0004_admin_access.sql). Every action: (1) confirms the
// caller is a super admin, (2) re-validates input on the server, (3) writes as
// the caller's own session so RLS is the final gate, (4) reports success only
// after Postgres confirms the write. The service-role key is never used.

import { revalidatePath } from "next/cache";
import { canAccess, isAdminArea, parseGrantInput } from "@/lib/admin/access";
import { ADMIN_NOT_SET_UP_MESSAGE, toAdminApiError } from "@/lib/api/admin-access";
import { getAdminGrants } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdminArea, GrantInput } from "@/types/admin";

export interface AdminActionError {
  code: "validation_error" | "not_found" | "unauthorized" | "server_error";
  message: string;
}

export interface AdminActionResult {
  ok: boolean;
  error?: AdminActionError;
}

const fail = (error: AdminActionError): AdminActionResult => ({ ok: false, error });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireSuper(): Promise<{ userId: string } | AdminActionResult> {
  const session = await getAdminGrants();
  if (!session || !canAccess(session.grants, "super")) {
    return fail({ code: "unauthorized", message: "Only a super admin can manage access." });
  }
  return { userId: session.userId };
}

function isFailure(value: { userId: string } | AdminActionResult): value is AdminActionResult {
  return "ok" in value;
}

function dbError(error: { code?: string }): AdminActionResult {
  const mapped = toAdminApiError(error);
  if (mapped.code === "not_set_up") return fail({ code: "server_error", message: ADMIN_NOT_SET_UP_MESSAGE });
  if (mapped.code === "unauthorized") return fail({ code: "unauthorized", message: mapped.message });
  return fail({ code: "server_error", message: "We couldn't save your changes. Please try again." });
}

export async function grantAdminAccessAction(input: GrantInput): Promise<AdminActionResult> {
  const caller = await requireSuper();
  if (isFailure(caller)) return caller;

  const parsed = parseGrantInput(input);
  if (!parsed.ok) return fail({ code: "validation_error", message: parsed.message });
  const { email, area } = parsed.value;

  const supabase = await createClient();
  const { data: found, error: findError } = await supabase.rpc("admin_find_user_by_email", { p_email: email });
  if (findError) return dbError(findError);
  const target = (found as { id?: unknown }[] | null)?.[0];
  if (!target || typeof target.id !== "string") {
    return fail({ code: "not_found", message: "No account uses that email. They need to sign up first." });
  }

  const { error } = await supabase.from("admin_grants").insert({ user_id: target.id, area, granted_by: caller.userId });
  if (error) {
    if (error.code === "23505") return fail({ code: "validation_error", message: "They already have that access." });
    return dbError(error);
  }

  revalidatePath("/admin/access");
  return { ok: true };
}

export async function revokeAdminAccessAction(userId: string, area: AdminArea): Promise<AdminActionResult> {
  const caller = await requireSuper();
  if (isFailure(caller)) return caller;
  if (!UUID.test(userId) || !isAdminArea(area)) return fail({ code: "validation_error", message: "Invalid access grant." });
  if (userId === caller.userId && area === "super") {
    return fail({ code: "validation_error", message: "You can't remove your own super admin access." });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("admin_grants").delete().eq("user_id", userId).eq("area", area).select("user_id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "That access grant no longer exists." });

  revalidatePath("/admin/access");
  return { ok: true };
}
