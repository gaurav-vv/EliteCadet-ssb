// Typed API client for the Practice Zone (AGENTS.md §9). Backed by
// lib/mock/practice.ts for now (pre-backend build-out — status.md, 2026-09-18).

import { PRACTICE_ACTIVITIES, getPracticeItems } from "@/lib/mock/practice";
import type {
  PracticeActivitySummary,
  PracticeItem,
  PracticeSubmissionInput,
  PracticeSubmissionResult,
  PsychologyTestType,
} from "@/types/practice";

export interface ApiError {
  code: "validation_error" | "network_error" | "server_error";
  message: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export async function getActivities(): Promise<ApiResult<PracticeActivitySummary[]>> {
  return { ok: true, data: PRACTICE_ACTIVITIES };
}

export async function getActivityDetail(
  testType: PsychologyTestType,
): Promise<ApiResult<{ summary: PracticeActivitySummary; items: PracticeItem[] }>> {
  const summary = PRACTICE_ACTIVITIES.find((a) => a.testType === testType);
  if (!summary) {
    return { ok: false, error: { code: "validation_error", message: "That practice activity doesn't exist." } };
  }
  return { ok: true, data: { summary, items: getPracticeItems(testType) } };
}

// Idempotency guard: the same key submitted twice (e.g. a double-click that
// slips past the UI's disabled state) returns the original result instead of
// creating a second submission. Resets on reload — a real backend persists
// this by submission key server-side instead.
const processedSubmissions = new Map<string, PracticeSubmissionResult>();

export async function submitPractice(
  input: PracticeSubmissionInput,
  idempotencyKey: string,
): Promise<ApiResult<PracticeSubmissionResult>> {
  const existing = processedSubmissions.get(idempotencyKey);
  if (existing) {
    return { ok: true, data: existing };
  }

  if (input.responses.length === 0) {
    return { ok: false, error: { code: "validation_error", message: "There's nothing to submit yet." } };
  }

  const result: PracticeSubmissionResult = {
    submissionId: idempotencyKey,
    submittedAt: new Date().toISOString(),
  };
  processedSubmissions.set(idempotencyKey, result);

  return { ok: true, data: result };
}
