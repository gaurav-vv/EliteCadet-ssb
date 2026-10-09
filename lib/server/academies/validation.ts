// Academy input parsing — pure (tests/unit/lib/academies-validation.test.ts).

import type { AcademyInput, AcademyListParams, AcademySort, AcademyStatus, AcademyStatusFilter, MemberRole } from "@/types/academies";

export const ACADEMY_PAGE_SIZE = 20;

export const DEFAULT_ACADEMY_PARAMS: AcademyListParams = { q: "", status: "all", sort: "newest", page: 1 };

const STATUS_FILTERS: readonly AcademyStatusFilter[] = ["all", "active", "suspended"];
const SORTS: readonly AcademySort[] = ["newest", "oldest", "name"];
const MEMBER_ROLES: readonly MemberRole[] = ["student", "mentor", "academy_admin"];

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export function isAcademyStatus(value: unknown): value is AcademyStatus {
  return value === "active" || value === "suspended";
}

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (MEMBER_ROLES as readonly string[]).includes(value);
}

export function parseAcademyListParams(raw: RawParams): AcademyListParams {
  const status = first(raw.status);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 80),
    status: (STATUS_FILTERS as readonly string[]).includes(status) ? (status as AcademyStatusFilter) : "all",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as AcademySort) : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildAcademyListQuery(params: Partial<AcademyListParams>): string {
  const merged = { ...DEFAULT_ACADEMY_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_ACADEMY_PARAMS) as (keyof AcademyListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_ACADEMY_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function hasActiveAcademyFilters(params: AcademyListParams): boolean {
  return params.q !== "" || params.status !== "all";
}

export type AcademyFieldErrors = Partial<Record<keyof AcademyInput, string>>;

export interface CleanAcademyInput {
  name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Server-side validation of the academy form; returns DB-ready columns.
export function validateAcademyInput(input: Partial<Record<keyof AcademyInput, unknown>>):
  | { ok: true; value: CleanAcademyInput }
  | { ok: false; errors: AcademyFieldErrors } {
  const errors: AcademyFieldErrors = {};
  const name = str(input.name).replace(/\s+/g, " ");
  const description = str(input.description);
  const logoUrl = str(input.logoUrl);
  const contactEmail = str(input.contactEmail).toLowerCase();
  const contactPhone = str(input.contactPhone);

  if (name.length < 2 || name.length > 80) errors.name = "Name must be 2–80 characters.";
  if (description.length > 500) errors.description = "Keep the description under 500 characters.";
  if (logoUrl) {
    let valid = false;
    try {
      valid = new URL(logoUrl).protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid || logoUrl.length > 500) errors.logoUrl = "Use an https:// image link.";
  }
  if (contactEmail && (!EMAIL_RE.test(contactEmail) || contactEmail.length > 254)) errors.contactEmail = "Enter a valid email.";
  if (contactPhone && !PHONE_RE.test(contactPhone)) errors.contactPhone = "Enter a valid phone number.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      description: description || null,
      logo_url: logoUrl || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    },
  };
}
