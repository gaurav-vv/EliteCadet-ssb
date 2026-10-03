import { isUuid } from "@/lib/academy/batch-validation";
import type { BatchListParams, BatchSort, BatchStatusFilter } from "@/types/academy";

export const BATCH_PAGE_SIZE = 20;

const STATUS_VALUES: BatchStatusFilter[] = ["active", "archived", "all"];
const SORT_VALUES: BatchSort[] = ["name", "newest", "oldest"];

// Active is the default view: archived batches are hidden until asked for.
export const DEFAULT_BATCH_PARAMS: BatchListParams = {
  q: "",
  mentor: "all",
  status: "active",
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

// URL → typed params. Unknown values fall back to defaults, and the mentor id
// must be "all", "none" or a UUID so a hand-edited URL can't reach the database.
export function parseBatchListParams(raw: RawParams): BatchListParams {
  const page = Number.parseInt(first(raw.page), 10);
  const mentor = first(raw.mentor);
  return {
    q: first(raw.q).trim().slice(0, 60),
    mentor: mentor === "none" || isUuid(mentor) ? mentor : "all",
    status: oneOf(first(raw.status), STATUS_VALUES, "active"),
    sort: oneOf(first(raw.sort), SORT_VALUES, "name"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Typed params → "" or "?a=b", omitting defaults so URLs stay short.
export function buildBatchListQuery(params: Partial<BatchListParams>): string {
  const merged = { ...DEFAULT_BATCH_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_BATCH_PARAMS) as (keyof BatchListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_BATCH_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildBatchListHref(params: Partial<BatchListParams>): string {
  return `/academy/batches${buildBatchListQuery(params)}`;
}

export function hasActiveBatchFilters(params: BatchListParams): boolean {
  return params.q !== "" || params.mentor !== "all" || params.status !== DEFAULT_BATCH_PARAMS.status;
}

// `%`, `_` and `\` are wildcards in ILIKE; escape them so searching "A_B" or
// "100%" matches the literal text.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-14" → "14 Sep 2026" without a time-zone shift (the value is a date,
// not an instant). Timestamps are accepted too (first 10 chars are the date).
export function formatBatchDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// "Created Sep 2026"
export function formatCreatedMonth(timestamp: string): string {
  const [y, m] = timestamp.slice(0, 7).split("-").map(Number);
  if (!y || !m) return "";
  return `${MONTHS[m - 1]} ${y}`;
}
