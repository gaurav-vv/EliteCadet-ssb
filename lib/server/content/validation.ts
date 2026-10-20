// Content input + list parsing — pure (tests/unit/lib/content-validation.test.ts).

import {
  CONTENT_AUDIENCES,
  CONTENT_CATEGORIES,
  CONTENT_DIFFICULTIES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  CONTENT_VISIBILITIES,
  type ContentAudience,
  type ContentCategory,
  type ContentDifficulty,
  type ContentInput,
  type ContentListParams,
  type ContentStatus,
  type ContentType,
  type ContentVisibility,
} from "@/types/content";

export const CONTENT_PAGE_SIZE = 20;

const oneOf = <T extends string>(map: Record<T, string>, value: unknown): value is T => typeof value === "string" && Object.prototype.hasOwnProperty.call(map, value);
export const isCategory = (v: unknown): v is ContentCategory => oneOf(CONTENT_CATEGORIES, v);
export const isContentType = (v: unknown): v is ContentType => oneOf(CONTENT_TYPES, v);
export const isDifficulty = (v: unknown): v is ContentDifficulty => oneOf(CONTENT_DIFFICULTIES, v);
export const isAudience = (v: unknown): v is ContentAudience => oneOf(CONTENT_AUDIENCES, v);
export const isVisibility = (v: unknown): v is ContentVisibility => oneOf(CONTENT_VISIBILITIES, v);
export const isContentStatus = (v: unknown): v is ContentStatus => oneOf(CONTENT_STATUSES, v);

export const DEFAULT_CONTENT_PARAMS: ContentListParams = { q: "", category: "all", type: "all", status: "all", difficulty: "all", page: 1 };

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

export function parseContentParams(raw: RawParams): ContentListParams {
  const page = Number.parseInt(first(raw.page), 10);
  const category = first(raw.category);
  const type = first(raw.type);
  const status = first(raw.status);
  const difficulty = first(raw.difficulty);
  return {
    q: first(raw.q).trim().slice(0, 80),
    category: isCategory(category) ? category : "all",
    type: isContentType(type) ? type : "all",
    status: isContentStatus(status) ? status : "all",
    difficulty: isDifficulty(difficulty) ? difficulty : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildContentQuery(params: Partial<ContentListParams>): string {
  const merged = { ...DEFAULT_CONTENT_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_CONTENT_PARAMS) as (keyof ContentListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_CONTENT_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function hasActiveContentFilters(p: ContentListParams): boolean {
  return p.q !== "" || p.category !== "all" || p.type !== "all" || p.status !== "all" || p.difficulty !== "all";
}

export type ContentFieldErrors = Partial<Record<keyof ContentInput, string>>;

export interface CleanContentInput {
  title: string;
  description: string | null;
  category: ContentCategory;
  type: ContentType;
  difficulty: ContentDifficulty;
  target_role: ContentAudience;
  visibility: ContentVisibility;
  body: string | null;
  external_url: string | null;
  is_template?: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Server-side validation of the content form; returns DB-ready columns.
export function validateContentInput(input: Partial<Record<keyof ContentInput, unknown>>): { ok: true; value: CleanContentInput } | { ok: false; errors: ContentFieldErrors } {
  const errors: ContentFieldErrors = {};
  const title = str(input.title).replace(/\s+/g, " ");
  const description = str(input.description);
  const body = str(input.body);
  const externalUrl = str(input.externalUrl);

  if (title.length < 3 || title.length > 140) errors.title = "Title must be 3–140 characters.";
  if (description.length > 500) errors.description = "Keep the description under 500 characters.";
  if (!isCategory(input.category)) errors.category = "Choose a category.";
  if (!isContentType(input.type)) errors.type = "Choose a type.";
  if (!isDifficulty(input.difficulty)) errors.difficulty = "Choose a difficulty.";
  if (!isAudience(input.targetRole)) errors.targetRole = "Choose who it's for.";
  if (!isVisibility(input.visibility)) errors.visibility = "Choose who can see it.";
  if (body.length > 20000) errors.body = "Keep the content under 20,000 characters.";
  if (externalUrl) {
    let ok = false;
    try {
      ok = new URL(externalUrl).protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok || externalUrl.length > 500) errors.externalUrl = "Use an https:// link.";
  }
  if (!body && !externalUrl && !errors.externalUrl) errors.body = "Add the content text, a link, or both.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      description: description || null,
      category: input.category as ContentCategory,
      type: input.type as ContentType,
      difficulty: input.difficulty as ContentDifficulty,
      target_role: input.targetRole as ContentAudience,
      visibility: input.visibility as ContentVisibility,
      body: body || null,
      external_url: externalUrl || null,
      ...(typeof input.isTemplate === "boolean" ? { is_template: input.isTemplate } : {}),
    },
  };
}

// ---- Content requests ------------------------------------------------------

import type { ContentRequestInput, ContentRequestStatus } from "@/types/content";

export type RequestFieldErrors = Partial<Record<keyof ContentRequestInput, string>>;

export interface CleanRequestInput {
  title: string;
  details: string;
  category: ContentCategory;
  type: ContentType;
  needed_by: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRequestInput(input: Partial<Record<keyof ContentRequestInput, unknown>>, today: string): { ok: true; value: CleanRequestInput } | { ok: false; errors: RequestFieldErrors } {
  const errors: RequestFieldErrors = {};
  const title = str(input.title).replace(/\s+/g, " ");
  const details = str(input.details);
  const neededBy = str(input.neededBy);
  if (title.length < 3 || title.length > 140) errors.title = "Title must be 3–140 characters.";
  if (details.length < 10 || details.length > 4000) errors.details = "Describe what you need in 10–4,000 characters.";
  if (!isCategory(input.category)) errors.category = "Choose a category.";
  if (!isContentType(input.type)) errors.type = "Choose a type.";
  if (neededBy) {
    const valid = ISO_DATE.test(neededBy) && !Number.isNaN(new Date(`${neededBy}T00:00:00Z`).getTime()) && new Date(`${neededBy}T00:00:00Z`).toISOString().slice(0, 10) === neededBy;
    if (!valid) errors.neededBy = "Enter a valid date.";
    else if (neededBy < today) errors.neededBy = "Choose today or a later date.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title, details, category: input.category as ContentCategory, type: input.type as ContentType, needed_by: neededBy || null } };
}

// Fee in INR: a positive amount with at most 2 decimals, up to ₹1 crore.
export function parseFee(value: unknown): number | null {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(/[,₹\s]/g, "") : "";
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const fee = Number(raw);
  return fee > 0 && fee <= 10_000_000 ? fee : null;
}

// Staff-side transitions (mentor-side ones are database functions).
export function canStaffMove(from: ContentRequestStatus, to: "quoted" | "in_progress"): boolean {
  if (to === "quoted") return from === "requested" || from === "quoted";
  return from === "accepted";
}

export function formatInr(amount: number): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
}

// Allowed status moves: draft ⇄ published → archived → draft (restore).
export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  if (from === to) return false;
  if (from === "draft") return to === "published" || to === "archived";
  if (from === "published") return to === "draft" || to === "archived";
  return to === "draft";
}
