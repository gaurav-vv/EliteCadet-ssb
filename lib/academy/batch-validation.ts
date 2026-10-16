import type { BatchFormInput } from "@/types/academy";

export const BATCH_NAME_MIN = 2;
export const BATCH_NAME_MAX = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

// True only for real calendar dates ("2026-02-30" is rejected).
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export interface BatchFieldErrors {
  name?: string;
  startDate?: string;
}

export type BatchValidation = { ok: true; value: BatchFormInput } | { ok: false; errors: BatchFieldErrors };

// Single source of truth for batch input rules: the dialog uses it for instant
// feedback and the server actions run it again before touching the database
// (never trust the browser). The database enforces the same limits.
export function validateBatchInput(raw: { name: string; startDate: string | null }): BatchValidation {
  const errors: BatchFieldErrors = {};
  const name = raw.name.trim().replace(/\s+/g, " ");
  const startDate = raw.startDate?.trim() ? raw.startDate.trim() : null;

  if (name.length < BATCH_NAME_MIN) errors.name = `Enter a batch name (at least ${BATCH_NAME_MIN} characters).`;
  else if (name.length > BATCH_NAME_MAX) errors.name = `Batch name must be ${BATCH_NAME_MAX} characters or fewer.`;

  if (startDate && !isIsoDate(startDate)) errors.startDate = "Enter a valid start date.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, startDate } };
}
