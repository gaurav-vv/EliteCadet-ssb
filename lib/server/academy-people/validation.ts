// Academy people (students / mentors) input parsing — pure
// (tests/unit/lib/academy-people-validation.test.ts).

import { isUuid } from "@/lib/server/users/validation";
import type { AcademyStudentListParams, StudentSortOption, StudentStatusFilter } from "@/types/academy-people";

export const STUDENT_PAGE_SIZE = 20;

export const DEFAULT_STUDENT_PARAMS: AcademyStudentListParams = { q: "", batch: "all", status: "all", sort: "name", page: 1 };

const STATUS: readonly StudentStatusFilter[] = ["all", "active", "suspended"];
const SORTS: readonly StudentSortOption[] = ["name", "newest", "oldest", "last_login"];

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export function parseStudentParams(raw: RawParams): AcademyStudentListParams {
  const batch = first(raw.batch);
  const status = first(raw.status);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 80),
    // "all", "none" or a UUID — anything else can't reach the database.
    batch: batch === "none" || isUuid(batch) ? batch : "all",
    status: (STATUS as readonly string[]).includes(status) ? (status as StudentStatusFilter) : "all",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as StudentSortOption) : "name",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildStudentQuery(params: Partial<AcademyStudentListParams>): string {
  const merged = { ...DEFAULT_STUDENT_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_STUDENT_PARAMS) as (keyof AcademyStudentListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_STUDENT_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildStudentHref(params: Partial<AcademyStudentListParams>): string {
  return `/academy/students${buildStudentQuery(params)}`;
}

export function hasActiveStudentFilters(params: AcademyStudentListParams): boolean {
  return params.q !== "" || params.batch !== "all" || params.status !== "all";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PersonInviteCheck = { ok: true; email: string; fullName: string } | { ok: false; field: "email" | "fullName"; message: string };

// Email always; a name only matters when we end up sending an invite.
export function checkPersonInput(input: { email?: unknown; fullName?: unknown }, needName: boolean): PersonInviteCheck {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ") : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, field: "email", message: "Enter a valid email address." };
  if (needName && (fullName.length < 2 || fullName.length > 80)) return { ok: false, field: "fullName", message: "Enter their full name (2–80 characters)." };
  return { ok: true, email, fullName };
}
