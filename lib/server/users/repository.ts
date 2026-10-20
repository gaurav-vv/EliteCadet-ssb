// User Management data access — the only place this module touches Postgres.
// Runs as the signed-in user's own session (anon key + RLS), so a non-super
// admin gets nothing beyond their own row even if a check above were missed.
// The service-role key is never used here.

import { createClient } from "@/lib/supabase/server";
import { isRole } from "@/lib/server/permissions/rbac";
import { isUserStatus, sanitizeSearch, USER_PAGE_SIZE } from "@/lib/server/users/validation";
import type { Role, UserStatus } from "@/types/auth";
import type { AuditEntry, PlatformUserSummary, UserListParams, UserRecord } from "@/types/users";

export interface DbError {
  code?: string;
  message?: string;
}

export type DbResult<T> = { data: T; error: null } | { data: null; error: DbError };

const USER_COLUMNS =
  "id, full_name, email, phone, role, status, academy_id, last_login_at, created_at, academy:academies!profiles_academy_id_fkey(name)";

// External data is validated at the boundary (AGENTS.md §9): a row without
// the expected shape is dropped rather than rendered half-broken.
export function toUserRecord(row: unknown): UserRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.created_at !== "string" || !isRole(r.role)) return null;
  const embedded = Array.isArray(r.academy) ? r.academy[0] : r.academy;
  const academyName =
    typeof embedded === "object" && embedded !== null && typeof (embedded as Record<string, unknown>).name === "string"
      ? ((embedded as Record<string, unknown>).name as string)
      : null;
  return {
    id: r.id,
    fullName: typeof r.full_name === "string" ? r.full_name : "",
    email: typeof r.email === "string" ? r.email : null,
    phone: typeof r.phone === "string" ? r.phone : null,
    role: r.role,
    status: isUserStatus(r.status) ? r.status : "active",
    academyId: typeof r.academy_id === "string" ? r.academy_id : null,
    academyName,
    lastLoginAt: typeof r.last_login_at === "string" ? r.last_login_at : null,
    createdAt: r.created_at,
  };
}

export async function findUsers(params: UserListParams, page: number): Promise<DbResult<{ rows: UserRecord[]; total: number }>> {
  const supabase = await createClient();
  let query = supabase.from("profiles").select(USER_COLUMNS, { count: "exact" });
  if (params.role !== "all") query = query.eq("role", params.role);
  if (params.status !== "all") query = query.eq("status", params.status);
  const q = sanitizeSearch(params.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  if (params.sort === "name") query = query.order("full_name", { ascending: true });
  else if (params.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (params.sort === "last_login") query = query.order("last_login_at", { ascending: false, nullsFirst: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * USER_PAGE_SIZE;
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + USER_PAGE_SIZE - 1);
  if (error) return { data: null, error };
  const rows = (data ?? []).map(toUserRecord).filter((u): u is UserRecord => u !== null);
  return { data: { rows, total: count ?? 0 }, error: null };
}

export async function findUserById(id: string): Promise<DbResult<UserRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(USER_COLUMNS).eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toUserRecord(data) : null, error: null };
}

// COUNT-only queries (no rows transferred), run in parallel.
export async function countPlatform(): Promise<DbResult<PlatformUserSummary>> {
  const supabase = await createClient();
  const profiles = () => supabase.from("profiles").select("id", { count: "exact", head: true });
  const [total, students, mentors, academyAdmins, superAdmins, suspended, academies] = await Promise.all([
    profiles(),
    profiles().eq("role", "student"),
    profiles().eq("role", "mentor"),
    profiles().eq("role", "academy_admin"),
    profiles().eq("role", "super_admin"),
    profiles().eq("status", "suspended"),
    supabase.from("academies").select("id", { count: "exact", head: true }),
  ]);
  const failed = [total, students, mentors, academyAdmins, superAdmins, suspended, academies].find((r) => r.error);
  if (failed?.error) return { data: null, error: failed.error };
  return {
    data: {
      total: total.count ?? 0,
      students: students.count ?? 0,
      mentors: mentors.count ?? 0,
      academyAdmins: academyAdmins.count ?? 0,
      superAdmins: superAdmins.count ?? 0,
      suspended: suspended.count ?? 0,
      academies: academies.count ?? 0,
    },
    error: null,
  };
}

export async function findRecentUsers(limit: number): Promise<DbResult<UserRecord[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(USER_COLUMNS).order("created_at", { ascending: false }).limit(limit);
  if (error) return { data: null, error };
  return { data: (data ?? []).map(toUserRecord).filter((u): u is UserRecord => u !== null), error: null };
}

// Returns how many rows changed, so "nothing matched" is distinguishable from success.
export async function updateUserRole(id: string, role: Role): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", id).select("id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update({ status }).eq("id", id).select("id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}

export async function insertAudit(entry: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
}): Promise<DbResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    details: entry.details,
  });
  return error ? { data: null, error } : { data: null, error: null };
}

export async function findAuditForTarget(targetType: string, targetId: string, limit: number): Promise<DbResult<AuditEntry[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, details, created_at, actor:profiles!audit_log_actor_id_fkey(full_name)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: null, error };
  const entries = (data ?? []).flatMap((row): AuditEntry[] => {
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "number" || typeof r.action !== "string" || typeof r.created_at !== "string") return [];
    const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
    const actorName =
      typeof actor === "object" && actor !== null && typeof (actor as Record<string, unknown>).full_name === "string"
        ? ((actor as Record<string, unknown>).full_name as string)
        : null;
    const details = typeof r.details === "object" && r.details !== null ? (r.details as Record<string, unknown>) : {};
    return [{ id: r.id, action: r.action, details, actorName, createdAt: r.created_at }];
  });
  return { data: entries, error: null };
}
