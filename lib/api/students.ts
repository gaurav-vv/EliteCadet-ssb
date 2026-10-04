// Academy Students read paths — REAL Supabase data (migrations/0004_academy_students.sql).
// Runs on the server as the signed-in admin (anon key + their session cookie),
// so Row Level Security scopes every query to their academy. The service-role
// key is never used here. Mutations live in lib/actions/students.ts.

import { escapeLikePattern } from "@/lib/academy/batch-list";
import { isUuid } from "@/lib/academy/batch-validation";
import { getAdminContext, UNAUTHORIZED, type DbError, type DbResult } from "@/lib/academy/admin-context";
import { STUDENT_PAGE_SIZE } from "@/lib/academy/student-list";
import { isStudentStatus } from "@/lib/academy/student-validation";
import { createClient } from "@/lib/supabase/server";
import type {
  BatchStatus,
  StudentBatchOption,
  StudentListParams,
  StudentListResult,
  StudentRecord,
  StudentSummary,
} from "@/types/academy";

export const STUDENTS_NOT_SET_UP_MESSAGE =
  "Students aren't set up in your database yet. Run supabase/migrations/0004_academy_students.sql in the Supabase SQL Editor, then reload.";

// PostgREST reports a missing table as PGRST205 (schema cache) / 42P01.
export function toStudentApiError(error: { code?: string; message?: string }): DbError {
  if (error.code === "PGRST205" || error.code === "42P01") return { code: "not_set_up", message: STUDENTS_NOT_SET_UP_MESSAGE };
  return { code: "server_error", message: "We couldn't load your students. Please try again." };
}

const SELECT = "id, full_name, status, batch_id, created_at, batch:batches!academy_students_batch_fkey(name)";

// External data is validated at the boundary (AGENTS.md section 9): a row that
// does not have the expected shape is dropped rather than rendered half-broken.
export function toStudentRecord(row: unknown): StudentRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.full_name !== "string" || typeof r.created_at !== "string" || !isStudentStatus(r.status)) {
    return null;
  }
  const embedded = Array.isArray(r.batch) ? r.batch[0] : r.batch;
  const batchName =
    typeof embedded === "object" && embedded !== null && typeof (embedded as Record<string, unknown>).name === "string"
      ? ((embedded as Record<string, unknown>).name as string)
      : null;
  return {
    id: r.id,
    fullName: r.full_name,
    status: r.status,
    batchId: typeof r.batch_id === "string" ? r.batch_id : null,
    batchName,
    createdAt: r.created_at,
  };
}

// Filtering, sorting and paging all happen in Postgres, so the page stays fast
// with thousands of students: only one page of rows ever leaves the database.
export async function getStudentList(params: StudentListParams): Promise<DbResult<StudentListResult>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();

  async function fetchPage(page: number) {
    let query = supabase.from("academy_students").select(SELECT, { count: "exact" }).eq("academy_id", admin!.academyId);
    if (params.status !== "all") query = query.eq("status", params.status);
    if (params.batch === "none") query = query.is("batch_id", null);
    else if (params.batch !== "all") query = query.eq("batch_id", params.batch);
    if (params.q) query = query.ilike("full_name", `%${escapeLikePattern(params.q)}%`);

    query =
      params.sort === "newest"
        ? query.order("created_at", { ascending: false })
        : params.sort === "oldest"
          ? query.order("created_at", { ascending: true })
          : query.order("full_name", { ascending: true });
    const from = (page - 1) * STUDENT_PAGE_SIZE;
    return query.order("id", { ascending: true }).range(from, from + STUDENT_PAGE_SIZE - 1);
  }

  let page = params.page;
  const first = await fetchPage(page);
  if (first.error) return { ok: false, error: toStudentApiError(first.error) };
  let data = first.data;
  const total = first.count ?? 0;

  // A stale ?page=9 after filtering: fall back to the last real page.
  const pageCount = Math.max(1, Math.ceil(total / STUDENT_PAGE_SIZE));
  if (page > pageCount) {
    page = pageCount;
    const last = await fetchPage(page);
    if (last.error) return { ok: false, error: toStudentApiError(last.error) };
    data = last.data;
  }

  const rows = (data ?? []).map(toStudentRecord).filter((r): r is StudentRecord => r !== null);
  return { ok: true, data: { rows, total, page, pageCount, pageSize: STUDENT_PAGE_SIZE } };
}

// Three COUNT queries, always over the whole academy regardless of the current
// filters. Also feeds the dashboard. Deliberately NOT `head: true`: a HEAD request
// swallows PostgREST errors (a missing table would come back as a count of 0 with
// no error), and a failed count must never be shown as zero students.
export async function getStudentSummary(): Promise<DbResult<StudentSummary>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();

  const base = () => supabase.from("academy_students").select("id", { count: "exact" }).eq("academy_id", admin.academyId).limit(1);
  const [all, active, noBatch] = await Promise.all([base(), base().eq("status", "active"), base().is("batch_id", null)]);

  const failed = all.error ?? active.error ?? noBatch.error;
  if (failed) return { ok: false, error: toStudentApiError(failed) };
  return { ok: true, data: { total: all.count ?? 0, active: active.count ?? 0, withoutBatch: noBatch.count ?? 0 } };
}

export async function getStudentById(id: string): Promise<DbResult<StudentRecord>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  if (!isUuid(id)) return { ok: false, error: { code: "not_found", message: "Student not found." } };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academy_students")
    .select(SELECT)
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .maybeSingle();
  if (error) return { ok: false, error: toStudentApiError(error) };
  const record = data ? toStudentRecord(data) : null;
  if (!record) return { ok: false, error: { code: "not_found", message: "Student not found." } };
  return { ok: true, data: record };
}

// The academy's batches, for the batch filter and the add/edit/move controls.
export async function getStudentBatchOptions(): Promise<DbResult<StudentBatchOption[]>> {
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: UNAUTHORIZED };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("batches")
    .select("id, name, status")
    .eq("academy_id", admin.academyId)
    .order("name", { ascending: true });
  if (error) return { ok: false, error: toStudentApiError(error) };

  const options = (data ?? []).flatMap((b) =>
    typeof b.id === "string" && typeof b.name === "string" && (b.status === "active" || b.status === "archived")
      ? [{ id: b.id, name: b.name, status: b.status as BatchStatus }]
      : [],
  );
  return { ok: true, data: options };
}
