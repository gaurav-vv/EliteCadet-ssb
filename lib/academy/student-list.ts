import type {
  AcademyBatch,
  AcademyMentor,
  AcademyStudent,
  AttentionStudent,
  StudentListParams,
  StudentListResult,
  StudentPerformanceFilter,
  StudentRow,
  StudentSort,
  StudentStatusFilter,
  StudentSummary,
} from "@/types/academy";

export const STUDENT_PAGE_SIZE = 20;

const STATUS_VALUES: StudentStatusFilter[] = ["all", "active", "inactive", "attention"];
const PERFORMANCE_VALUES: StudentPerformanceFilter[] = ["all", "below60", "60to79", "80plus", "unassessed"];
const SORT_VALUES: StudentSort[] = ["name", "recent", "performance", "activity"];

export const DEFAULT_STUDENT_PARAMS: StudentListParams = {
  q: "",
  status: "all",
  batch: "all",
  mentor: "all",
  performance: "all",
  sort: "name",
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

// URL → typed params. Anything unrecognised falls back to the default, so a
// hand-edited or stale URL can never break the page.
export function parseStudentListParams(raw: RawParams): StudentListParams {
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 100),
    status: oneOf(first(raw.status), STATUS_VALUES, "all"),
    batch: first(raw.batch) || "all",
    mentor: first(raw.mentor) || "all",
    performance: oneOf(first(raw.performance), PERFORMANCE_VALUES, "all"),
    sort: oneOf(first(raw.sort), SORT_VALUES, "name"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Typed params → query string ("" or "?a=b"), omitting defaults so URLs stay short.
export function buildStudentListQuery(params: Partial<StudentListParams>): string {
  const merged = { ...DEFAULT_STUDENT_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_STUDENT_PARAMS) as (keyof StudentListParams)[]).forEach((key) => {
    const value = merged[key];
    if (value !== DEFAULT_STUDENT_PARAMS[key]) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildStudentListHref(params: Partial<StudentListParams>): string {
  return `/academy/students${buildStudentListQuery(params)}`;
}

export function hasActiveFilters(params: StudentListParams): boolean {
  return (
    params.q !== "" ||
    params.status !== "all" ||
    params.batch !== "all" ||
    params.mentor !== "all" ||
    params.performance !== "all"
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Joins the flat student records with batch/mentor names and the existing
// attention rule. This is the single place a Supabase join would replace.
export function buildStudentRows(
  students: AcademyStudent[],
  batches: AcademyBatch[],
  mentors: AcademyMentor[],
  attention: AttentionStudent[],
): StudentRow[] {
  const batchName = new Map(batches.map((b) => [b.id, b.name]));
  const mentorName = new Map(mentors.map((m) => [m.id, m.fullName]));
  const attentionReason = new Map(attention.map((a) => [a.studentId, a.reason]));

  return students.map((s) => {
    const reason = attentionReason.get(s.id) ?? null;
    const inactive = s.status === "inactive";
    return {
      id: s.id,
      fullName: s.fullName,
      initials: initialsOf(s.fullName),
      batchId: s.batchId,
      batchName: s.batchId ? (batchName.get(s.batchId) ?? null) : null,
      mentorId: s.mentorId,
      mentorName: s.mentorId ? (mentorName.get(s.mentorId) ?? null) : null,
      readiness: s.readiness,
      lastActivityAt: s.lastActivityAt,
      status: inactive ? "inactive" : reason ? "attention" : "active",
      attentionReason: inactive ? null : reason,
    };
  });
}

// Computed over ALL students, never the filtered subset.
// "active" counts everyone not marked inactive (including those flagged for
// attention); "needingAttention" counts active students flagged by the rule, so
// the card matches the "Needs attention" filter exactly.
export function summarizeStudents(rows: StudentRow[]): StudentSummary {
  return {
    total: rows.length,
    active: rows.filter((r) => r.status !== "inactive").length,
    withoutBatch: rows.filter((r) => r.batchId === null).length,
    needingAttention: rows.filter((r) => r.status === "attention").length,
  };
}

function matchesPerformance(readiness: number | null, filter: StudentPerformanceFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unassessed":
      return readiness === null;
    case "below60":
      return readiness !== null && readiness < 60;
    case "60to79":
      return readiness !== null && readiness >= 60 && readiness < 80;
    case "80plus":
      return readiness !== null && readiness >= 80;
  }
}

function byName(a: StudentRow, b: StudentRow): number {
  return a.fullName.localeCompare(b.fullName, "en", { sensitivity: "base" });
}

function descNullsLast(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

// Filters + sort + pagination as one pure function. Today it runs over the
// in-memory list; with Supabase the same params become WHERE / ORDER BY /
// range() — callers and UI stay unchanged.
// "recent": the mock has no created-at field, so the order students were
// added is used (newest are pushed last in the source array, shown first).
export function queryStudents(rows: StudentRow[], params: StudentListParams, pageSize = STUDENT_PAGE_SIZE): StudentListResult {
  const needle = params.q.toLowerCase();
  const indexOf = new Map(rows.map((r, i) => [r.id, i]));

  const filtered = rows.filter((r) => {
    if (needle && !r.fullName.toLowerCase().includes(needle)) return false;
    if (params.status !== "all" && r.status !== params.status) return false;
    if (params.batch === "none" ? r.batchId !== null : params.batch !== "all" && r.batchId !== params.batch) return false;
    if (params.mentor === "none" ? r.mentorId !== null : params.mentor !== "all" && r.mentorId !== params.mentor) return false;
    return matchesPerformance(r.readiness, params.performance);
  });

  filtered.sort((a, b) => {
    switch (params.sort) {
      case "recent":
        return (indexOf.get(b.id) ?? 0) - (indexOf.get(a.id) ?? 0);
      case "performance":
        return descNullsLast(a.readiness, b.readiness) || byName(a, b);
      case "activity":
        return (
          descNullsLast(
            a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : null,
            b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : null,
          ) || byName(a, b)
        );
      default:
        return byName(a, b);
    }
  });

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total, page, pageCount, pageSize };
}
