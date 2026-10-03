// Batches read paths — REAL Supabase data (supabase/migrations/0003_batches.sql).
// Runs on the server as the signed-in admin (anon key + their session cookie),
// so Row Level Security scopes every query to their academy. The service-role
// key is never used. Mutations live in lib/actions/batches.ts.

import { escapeLikePattern, BATCH_PAGE_SIZE } from "@/lib/academy/batch-list";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  BatchListParams,
  BatchListResult,
  BatchMentorOption,
  BatchRecord,
  BatchStatus,
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

const SELECT = "id, name, status, start_date, created_at, mentor_id, mentor:profiles!batches_mentor_id_fkey(full_name)";

function isStatus(value: unknown): value is BatchStatus {
  return value === "active" || value === "archived";
}

// External data is validated at the boundary (AGENTS.md §9): a row that does
// not have the expected shape is dropped rather than rendered half-broken.
export function toBatchRecord(row: unknown): BatchRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.created_at !== "string" || !isStatus(r.status)) return null;

  // Many-to-one embeds arrive as an object; tolerate a one-element array too.
  const embedded = Array.isArray(r.mentor) ? r.mentor[0] : r.mentor;
  const mentorName =
    typeof embedded === "object" && embedded !== null && typeof (embedded as Record<string, unknown>).full_name === "string"
      ? ((embedded as Record<string, unknown>).full_name as string)
      : null;

  return {
    id: r.id,
    name: r.name,
    status: r.status,
    startDate: typeof r.start_date === "string" ? r.start_date : null,
    createdAt: r.created_at,
    mentorId: typeof r.mentor_id === "string" ? r.mentor_id : null,
    mentorName,
  };
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
    let query = supabase.from("batches").select(SELECT, { count: "exact" }).eq("academy_id", admin!.academyId);
    if (params.status !== "all") query = query.eq("status", params.status);
    if (params.mentor === "none") query = query.is("mentor_id", null);
    else if (params.mentor !== "all") query = query.eq("mentor_id", params.mentor);
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

  const base = () => supabase.from("batches").select("id", { count: "exact", head: true }).eq("academy_id", admin.academyId);
  const [all, active, noMentor] = await Promise.all([
    base(),
    base().eq("status", "active"),
    base().eq("status", "active").is("mentor_id", null),
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
