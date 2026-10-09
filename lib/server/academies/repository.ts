// Academy data access — the only place this module touches Postgres. Runs as
// the signed-in user's own session (anon key + RLS); never the service role.

import { createClient } from "@/lib/supabase/server";
import { isRole } from "@/lib/server/permissions/rbac";
import { sanitizeSearch } from "@/lib/server/users/validation";
import { ACADEMY_PAGE_SIZE, isAcademyStatus, type CleanAcademyInput } from "@/lib/server/academies/validation";
import type { DbError, DbResult } from "@/lib/server/users/repository";
import type { AcademyStatus } from "@/types/academies";
import type { AcademyListParams, AcademyMember, AcademyMemberCounts, AcademyOption, AcademyRecord } from "@/types/academies";
import type { Role } from "@/types/auth";

export type { DbError, DbResult };

const ACADEMY_COLUMNS = "id, name, description, logo_url, contact_email, contact_phone, status, created_at";

const text = (v: unknown) => (typeof v === "string" && v ? v : null);

export function toAcademyRecord(row: unknown): AcademyRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.created_at !== "string") return null;
  return {
    id: r.id,
    name: r.name,
    description: text(r.description),
    logoUrl: text(r.logo_url),
    contactEmail: text(r.contact_email),
    contactPhone: text(r.contact_phone),
    status: isAcademyStatus(r.status) ? r.status : "active",
    createdAt: r.created_at,
  };
}

export function toMember(row: unknown): AcademyMember | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || !isRole(r.role)) return null;
  return {
    id: r.id,
    fullName: typeof r.full_name === "string" ? r.full_name : "",
    email: text(r.email),
    role: r.role,
    status: r.status === "suspended" ? "suspended" : "active",
  };
}

const ZERO: AcademyMemberCounts = { admins: 0, mentors: 0, students: 0 };

export async function countMembers(academyIds: string[]): Promise<DbResult<Map<string, AcademyMemberCounts>>> {
  const map = new Map<string, AcademyMemberCounts>();
  if (academyIds.length === 0) return { data: map, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("academy_member_counts").select("academy_id, admins, mentors, students").in("academy_id", academyIds);
  if (error) return { data: null, error };
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    if (typeof r.academy_id === "string") {
      map.set(r.academy_id, { admins: Number(r.admins) || 0, mentors: Number(r.mentors) || 0, students: Number(r.students) || 0 });
    }
  }
  return { data: map, error: null };
}

export function countsFor(map: Map<string, AcademyMemberCounts>, id: string): AcademyMemberCounts {
  return map.get(id) ?? ZERO;
}

export async function findAcademies(params: AcademyListParams, page: number): Promise<DbResult<{ rows: AcademyRecord[]; total: number }>> {
  const supabase = await createClient();
  let query = supabase.from("academies").select(ACADEMY_COLUMNS, { count: "exact" });
  if (params.status !== "all") query = query.eq("status", params.status);
  const q = sanitizeSearch(params.q);
  if (q) query = query.or(`name.ilike.%${q}%,contact_email.ilike.%${q}%`);
  if (params.sort === "name") query = query.order("name", { ascending: true });
  else query = query.order("created_at", { ascending: params.sort === "oldest" });
  const from = (page - 1) * ACADEMY_PAGE_SIZE;
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + ACADEMY_PAGE_SIZE - 1);
  if (error) return { data: null, error };
  return { data: { rows: (data ?? []).map(toAcademyRecord).filter((a): a is AcademyRecord => a !== null), total: count ?? 0 }, error: null };
}

export async function findAcademyById(id: string): Promise<DbResult<AcademyRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("academies").select(ACADEMY_COLUMNS).eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toAcademyRecord(data) : null, error: null };
}

export async function findAcademyOptions(): Promise<DbResult<AcademyOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("academies").select("id, name").order("name", { ascending: true }).limit(500);
  if (error) return { data: null, error };
  return { data: (data ?? []).flatMap((r) => (typeof r.id === "string" && typeof r.name === "string" ? [{ id: r.id, name: r.name }] : [])), error: null };
}

export async function insertAcademy(values: CleanAcademyInput): Promise<DbResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("academies").insert(values).select("id").single();
  if (error || !data) return { data: null, error: error ?? {} };
  return { data: { id: data.id as string }, error: null };
}

export async function updateAcademy(id: string, values: Partial<CleanAcademyInput> & { status?: AcademyStatus }): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("academies").update(values).eq("id", id).select("id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}

export async function findMembers(academyId: string): Promise<DbResult<AcademyMember[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("academy_id", academyId)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true })
    .limit(500);
  if (error) return { data: null, error };
  return { data: (data ?? []).map(toMember).filter((m): m is AcademyMember => m !== null), error: null };
}

export async function findProfileByEmail(email: string): Promise<DbResult<{ id: string; role: Role; academyId: string | null; fullName: string } | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, role, academy_id, full_name").eq("email", email.trim().toLowerCase()).maybeSingle();  // Supabase Auth stores emails lowercased
  if (error) return { data: null, error };
  if (!data || typeof data.id !== "string" || !isRole(data.role)) return { data: null, error: null };
  return {
    data: { id: data.id, role: data.role, academyId: typeof data.academy_id === "string" ? data.academy_id : null, fullName: typeof data.full_name === "string" ? data.full_name : "" },
    error: null,
  };
}

// Membership lives only in profiles.academy_id (plus the role it implies).
export async function setMembership(userId: string, values: { academy_id: string | null; role?: Role }): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(values).eq("id", userId).select("id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}
