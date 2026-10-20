// Batches read paths — REAL Supabase data (supabase/migrations/0003_batches.sql).
// Runs on the server as the signed-in admin (anon key + their session cookie),
// so Row Level Security scopes every query to their academy. The service-role
// key is never used. Mutations live in lib/actions/batches.ts.

import { escapeLikePattern, BATCH_PAGE_SIZE } from "@/lib/academy/batch-list";
import { isUuid } from "@/lib/academy/batch-validation";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  BatchDetail,
  BatchListParams,
  BatchListResult,
  BatchMentorOption,
  BatchRecord,
  BatchStatus,
  BatchStudent,
  BatchSummary,
} from "@/types/academy";

export interface BatchApiError {
  code: "unauthorized" | "not_set_up" | "server_error";
  message: string;
}

export interface BatchApiResult<T> {
  ok: boolean;
  data?: T;
  error?: BatchApiError;
}

export const BATCHES_NOT_SET_UP_MESSAGE =
  "Batches aren't set up in your database yet. Run supabase/migrations/0003_batches.sql in the Supabase SQL Editor, then reload.";

// PostgREST reports a missing table as PGRST205 (schema cache) / 42P01.
export function toBatchApiError(error: { code?: string; message?: string }): BatchApiError {
  if (error.code === "PGRST205" || error.code === "42P01") return { code: "not_set_up", message: BATCHES_NOT_SET_UP_MESSAGE };
  return { code: "server_error", message: "We couldn't load your batches. Please try again." };
}

// public.batch_overview (0007): one row per batch with its mentors and student count.
const SELECT = "id, name, status, start_date, created_at, mentors, student_count";

function isStatus(value: unknown): value is BatchStatus {
  return value === "active" || value === "archived";
}

// External data is validated at the boundary (AGENTS.md §9): a row that does
// not have the expected shape is dropped rather than rendered half-broken.
export function toBatchRecord(row: unknown): BatchRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.created_at !== "string" || !isStatus(r.status)) return null;

  const mentors = (Array.isArray(r.mentors) ? r.mentors : []).flatMap((m) => {
    const o = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
    return typeof o.id === "string" ? [{ id: o.id, name: typeof o.name === "string" && o.name ? o.name : "Unnamed mentor" }] : [];
  });

  return {
    id: r.id,
    name: r.name,
    status: r.status,
    startDate: typeof r.start_date === "string" ? r.start_date : null,
    createdAt: r.created_at,
    mentors,
    studentCount: Number(r.student_count) || 0,
  };
}

export function toBatchStudent(row: unknown): BatchStudent | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  return { id: r.id, fullName: typeof r.full_name === "string" ? r.full_name : "", email: typeof r.email === "string" ? r.email : null };
}

async function getAdminContext(): Promise<{ academyId: string } | null> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile || profile.role !== "academy_admin" || !profile.academyId) return null;
  return { academyId: profile.academyId };
}

const UNAUTHORIZED: BatchApiError = { code: "unauthorized", message: "You need to be signed in as an academy admin to view batches." };

// Filtering, sorting and paging all happen in Postgres, so the page stays fast
// with hundreds of batches: only one page of rows ever leaves the database.
export async function getBatchList(params: BatchListParams): Promise<BatchApiResult<BatchListResult>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();

  async function fetchPage(page: number) {
    let query = supabase.from("batch_overview").select(SELECT, { count: "exact" }).eq("academy_id", admin!.academyId);
    if (params.status !== "all") query = query.eq("status", params.status);
    if (params.mentor === "none") query = query.eq("mentor_count", 0);
    else if (params.mentor !== "all") query = query.contains("mentor_ids", [params.mentor]);
    if (params.q) query = query.ilike("name", `%${escapeLikePattern(params.q)}%`);

    query =
      params.sort === "newest"
        ? query.order("created_at", { ascending: false })
        : params.sort === "oldest"
          ? query.order("created_at", { ascending: true })
          : query.order("name", { ascending: true });
    const from = (page - 1) * BATCH_PAGE_SIZE;
    return query.order("id", { ascending: true }).range(from, from + BATCH_PAGE_SIZE - 1);
  }

  let page = params.page;
  const first = await fetchPage(page);
  const count = first.count;
  let data = first.data;
  if (first.error) return { ok: false, error: toBatchApiError(first.error) };

  // A stale ?page=9 after filtering: fall back to the last real page.
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / BATCH_PAGE_SIZE));
  if (page > pageCount) {
    page = pageCount;
    const last = await fetchPage(page);
    if (last.error) return { ok: false, error: toBatchApiError(last.error) };
    data = last.data;
  }

  const rows = (data ?? []).map(toBatchRecord).filter((r): r is BatchRecord => r !== null);
  return { ok: true, data: { rows, total, page, pageCount, pageSize: BATCH_PAGE_SIZE } };
}

// Three COUNT queries (head-only: no rows transferred), always over the whole
// academy regardless of the current filters.
export async function getBatchSummary(): Promise<BatchApiResult<BatchSummary>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();

  const base = () => supabase.from("batch_overview").select("id", { count: "exact", head: true }).eq("academy_id", admin.academyId);
  const [all, active, noMentor] = await Promise.all([
    base(),
    base().eq("status", "active"),
    base().eq("status", "active").eq("mentor_count", 0),
  ]);

  const failed = all.error ?? active.error ?? noMentor.error;
  if (failed) return { ok: false, error: toBatchApiError(failed) };
  return { ok: true, data: { total: all.count ?? 0, active: active.count ?? 0, withoutMentor: noMentor.count ?? 0 } };
}

// Mentors in the admin's academy (profiles with role = 'mentor'), for the
// mentor filter and the assign/change-mentor controls.
export async function getBatchMentorOptions(): Promise<BatchApiResult<BatchMentorOption[]>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "mentor")
    .eq("academy_id", admin.academyId)
    .order("full_name", { ascending: true });

  if (error) return { ok: false, error: toBatchApiError(error) };
  const options = (data ?? []).flatMap((p) =>
    typeof p.id === "string" ? [{ id: p.id, name: typeof p.full_name === "string" && p.full_name ? p.full_name : "Unnamed mentor" }] : [],
  );
  return { ok: true, data: options };
}

// One batch with its roster, plus the academy's unassigned students and the
// mentors not yet on it. Everything is scoped to the admin's academy (RLS and
// the explicit academy filter), so another academy's batch id is "not found".
export async function getBatchDetail(id: string): Promise<BatchApiResult<BatchDetail> & { notFound?: boolean }> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  if (!isUuid(id)) return { ok: false, notFound: true };
  const supabase = await createClient();

  const { data: row, error } = await supabase.from("batch_overview").select(SELECT).eq("id", id).eq("academy_id", admin.academyId).maybeSingle();
  if (error) return { ok: false, error: toBatchApiError(error) };
  const batch = row ? toBatchRecord(row) : null;
  if (!batch) return { ok: false, notFound: true };

  const students = () => supabase.from("academy_students").select("id, full_name, email").eq("academy_id", admin.academyId).order("full_name", { ascending: true });
  const [members, available, mentors] = await Promise.all([
    students().eq("batch_id", id),
    students().is("batch_id", null).limit(500),
    getBatchMentorOptions(),
  ]);
  const failed = members.error ?? available.error;
  if (failed) return { ok: false, error: toBatchApiError(failed) };
  if (!mentors.ok) return { ok: false, error: mentors.error };

  const onBatch = new Set(batch.mentors.map((m) => m.id));
  return {
    ok: true,
    data: {
      batch,
      students: (members.data ?? []).map(toBatchStudent).filter((s): s is BatchStudent => s !== null),
      availableStudents: (available.data ?? []).map(toBatchStudent).filter((s): s is BatchStudent => s !== null),
      availableMentors: (mentors.data ?? []).filter((m) => !onBatch.has(m.id)),
    },
  };
}

// Active batches in the admin's academy (id + name), for batch pickers/filters.
export async function getAcademyBatchOptions(): Promise<BatchApiResult<{ id: string; name: string }[]>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();
  const { data, error } = await supabase.from("batches").select("id, name").eq("academy_id", admin.academyId).eq("status", "active").order("name", { ascending: true }).limit(500);
  if (error) return { ok: false, error: toBatchApiError(error) };
  return { ok: true, data: (data ?? []).flatMap((b) => (typeof b.id === "string" && typeof b.name === "string" ? [{ id: b.id, name: b.name }] : [])) };
}
