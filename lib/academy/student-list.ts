import { isUuid } from "@/lib/academy/batch-validation";
import type { StudentListParams, StudentSort, StudentStatusFilter } from "@/types/academy";

export const STUDENT_PAGE_SIZE = 20;

const STATUS_VALUES: StudentStatusFilter[] = ["all", "active", "inactive"];
const SORT_VALUES: StudentSort[] = ["name", "newest", "oldest"];

export const DEFAULT_STUDENT_PARAMS: StudentListParams = {
  q: "",
  status: "all",
  batch: "all",
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

// URL -> typed params. Unknown values fall back to defaults, and the batch must
// be "all", "none" or a UUID so a hand-edited URL can never reach the database.
export function parseStudentListParams(raw: RawParams): StudentListParams {
  const page = Number.parseInt(first(raw.page), 10);
  const batch = first(raw.batch);
  return {
    q: first(raw.q).trim().slice(0, 80),
    status: oneOf(first(raw.status), STATUS_VALUES, "all"),
    batch: batch === "none" || isUuid(batch) ? batch : "all",
    sort: oneOf(first(raw.sort), SORT_VALUES, "name"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Typed params -> "" or "?a=b", omitting defaults so URLs stay short.
export function buildStudentListQuery(params: Partial<StudentListParams>): string {
  const merged = { ...DEFAULT_STUDENT_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_STUDENT_PARAMS) as (keyof StudentListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_STUDENT_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildStudentListHref(params: Partial<StudentListParams>): string {
  return `/academy/students${buildStudentListQuery(params)}`;
}

export function hasActiveStudentFilters(params: StudentListParams): boolean {
  return params.q !== "" || params.status !== "all" || params.batch !== "all";
}

// "14 Sep 2026" in the academy's time zone (IST), from a timestamp.
export function formatStudentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
