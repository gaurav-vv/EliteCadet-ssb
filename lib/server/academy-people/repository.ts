// Academy people data access. Runs as the signed-in user's own session (anon
// key + RLS); every query is also filtered by the caller's academy id. The
// service-role client is used ONLY to send an invite email (inviteByEmail),
// which the anon key cannot do.

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/server/users/validation";
import { STUDENT_PAGE_SIZE } from "@/lib/server/academy-people/validation";
import type { DbResult } from "@/lib/server/users/repository";
import type { AcademyMentorRecord, AcademyStudentListParams, AcademyStudentRecord, AcademyStudentSummary } from "@/types/academy-people";

const STUDENT_COLUMNS = "id, full_name, email, status, batch_id, batch_name, last_login_at, created_at";

export function toStudent(row: unknown): AcademyStudentRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.created_at !== "string") return null;
  return {
    id: r.id,
    fullName: typeof r.full_name === "string" ? r.full_name : "",
    email: typeof r.email === "string" ? r.email : null,
    status: r.status === "suspended" ? "suspended" : "active",
    batchId: typeof r.batch_id === "string" ? r.batch_id : null,
    batchName: typeof r.batch_name === "string" ? r.batch_name : null,
    lastLoginAt: typeof r.last_login_at === "string" ? r.last_login_at : null,
    createdAt: r.created_at,
  };
}

export async function findStudents(academyId: string, params: AcademyStudentListParams, page: number, batchIds?: string[]): Promise<DbResult<{ rows: AcademyStudentRecord[]; total: number }>> {
  const supabase = await createClient();
  let query = supabase.from("academy_students").select(STUDENT_COLUMNS, { count: "exact" }).eq("academy_id", academyId);
  if (batchIds) query = query.in("batch_id", batchIds.length > 0 ? batchIds : ["00000000-0000-0000-0000-000000000000"]);
  if (params.batch === "none") query = query.is("batch_id", null);
  else if (params.batch !== "all") query = query.eq("batch_id", params.batch);
  if (params.status !== "all") query = query.eq("status", params.status);
  const q = sanitizeSearch(params.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (params.sort === "newest") query = query.order("created_at", { ascending: false });
  else if (params.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (params.sort === "last_login") query = query.order("last_login_at", { ascending: false, nullsFirst: false });
  else query = query.order("full_name", { ascending: true });
  const from = (page - 1) * STUDENT_PAGE_SIZE;
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + STUDENT_PAGE_SIZE - 1);
  if (error) return { data: null, error };
  return { data: { rows: (data ?? []).map(toStudent).filter((s): s is AcademyStudentRecord => s !== null), total: count ?? 0 }, error: null };
}

export async function countStudents(academyId: string): Promise<DbResult<AcademyStudentSummary>> {
  const supabase = await createClient();
  const base = () => supabase.from("academy_students").select("id", { count: "exact", head: true }).eq("academy_id", academyId);
  const [total, without, suspended] = await Promise.all([base(), base().is("batch_id", null), base().eq("status", "suspended")]);
  const failed = total.error ?? without.error ?? suspended.error;
  if (failed) return { data: null, error: failed };
  const t = total.count ?? 0;
  const w = without.count ?? 0;
  return { data: { total: t, withoutBatch: w, inBatch: t - w, suspended: suspended.count ?? 0 }, error: null };
}

export async function findStudent(academyId: string, id: string): Promise<DbResult<AcademyStudentRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("academy_students").select(STUDENT_COLUMNS).eq("academy_id", academyId).eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  return { data: data ? toStudent(data) : null, error: null };
}

export async function findBatchMentors(batchId: string): Promise<DbResult<{ id: string; name: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("batch_overview").select("mentors").eq("id", batchId).maybeSingle();
  if (error) return { data: null, error };
  const list = Array.isArray(data?.mentors) ? data.mentors : [];
  return {
    data: list.flatMap((m: unknown) => {
      const o = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
      return typeof o.id === "string" ? [{ id: o.id, name: typeof o.name === "string" && o.name ? o.name : "Unnamed mentor" }] : [];
    }),
    error: null,
  };
}

export async function addExistingStudent(email: string): Promise<DbResult<{ id: string; fullName: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("academy_add_student", { p_email: email });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.id !== "string") return { data: null, error: { code: "P0002" } };
  return { data: { id: row.id, fullName: typeof row.full_name === "string" ? row.full_name : "" }, error: null };
}

export async function removeStudent(id: string): Promise<DbResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("academy_remove_student", { p_student: id });
  return error ? { data: null, error } : { data: null, error: null };
}

// Service role, server-side only: the signup trigger (0007) trusts role +
// academy_id from an INVITE (invited_at is set), never from a browser signup.
export async function inviteByEmail(input: { email: string; fullName: string; role: "student" | "mentor"; academyId: string; redirectTo: string }): Promise<DbResult<{ id: string }>> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName, role: input.role, academy_id: input.academyId },
    redirectTo: input.redirectTo,
  });
  if (error || !data.user) return { data: null, error: { code: (error as { code?: string } | null)?.code ?? "invite_failed", message: error?.message } };
  return { data: { id: data.user.id }, error: null };
}

export async function findMentors(academyId: string): Promise<DbResult<AcademyMentorRecord[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, last_login_at, batch_mentors(batch:batches(id, name))")
    .eq("academy_id", academyId)
    .eq("role", "mentor")
    .order("full_name", { ascending: true })
    .limit(500);
  if (error) return { data: null, error };
  const rows = (data ?? []).flatMap((row): AcademyMentorRecord[] => {
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string") return [];
    const links = Array.isArray(r.batch_mentors) ? r.batch_mentors : [];
    const batches = links.flatMap((l: unknown) => {
      const link = typeof l === "object" && l !== null ? (l as Record<string, unknown>) : {};
      const b = Array.isArray(link.batch) ? link.batch[0] : link.batch;
      const o = typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
      return typeof o.id === "string" && typeof o.name === "string" ? [{ id: o.id, name: o.name }] : [];
    });
    return [
      {
        id: r.id,
        fullName: typeof r.full_name === "string" ? r.full_name : "",
        email: typeof r.email === "string" ? r.email : null,
        status: r.status === "suspended" ? "suspended" : "active",
        invited: typeof r.last_login_at !== "string",
        batches,
      },
    ];
  });
  return { data: rows, error: null };
}

// The mentor's own batch ids (RLS: a mentor reads only their own rows).
export async function findMyBatchIds(mentorId: string): Promise<DbResult<{ id: string; name: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("batch_mentors").select("batch:batches(id, name)").eq("mentor_id", mentorId);
  if (error) return { data: null, error };
  return {
    data: (data ?? []).flatMap((row) => {
      const b = Array.isArray(row.batch) ? row.batch[0] : row.batch;
      const o = typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
      return typeof o.id === "string" && typeof o.name === "string" ? [{ id: o.id, name: o.name }] : [];
    }),
    error: null,
  };
}
