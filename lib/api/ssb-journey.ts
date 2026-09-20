// Typed API client for the 5-Day SSB Practice Journey (T039, AGENTS.md §9).
// Backed by lib/mock/ssb-journey.ts for now (pre-backend build-out, same
// pattern as lib/api/practice.ts). Test-mode bank submissions get their own
// idempotency-guarded function here rather than reusing lib/api/practice.ts's
// submitPractice, since that contract is typed specifically to
// PsychologyTestType and is already consumed elsewhere (AGENTS.md §19: don't
// change a shared lib/api contract without cause).

import { getAllModules, getModuleDetail, getModulesForDay, SSB_DAYS } from "@/lib/mock/ssb-journey";
import type { SsbDayId, SsbDaySummary, SsbModuleDetail, SsbModuleSummary } from "@/types/ssb-journey";

export interface ApiError {
  code: "validation_error" | "network_error" | "server_error";
  message: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export async function getDays(): Promise<ApiResult<SsbDaySummary[]>> {
  return { ok: true, data: SSB_DAYS };
}

export async function getDayModules(dayId: SsbDayId): Promise<ApiResult<SsbModuleSummary[]>> {
  if (!SSB_DAYS.some((d) => d.id === dayId)) {
    return { ok: false, error: { code: "validation_error", message: "That day doesn't exist." } };
  }
  return { ok: true, data: getModulesForDay(dayId) };
}

export async function getSsbModuleDetail(dayId: SsbDayId, moduleId: string): Promise<ApiResult<SsbModuleDetail>> {
  const detail = getModuleDetail(dayId, moduleId);
  if (!detail) {
    return { ok: false, error: { code: "validation_error", message: "That practice module doesn't exist." } };
  }
  return { ok: true, data: detail };
}

/**
 * Every practice-mode bank module across all 5 days, for the overall/day-level
 * progress rings — always the real dummy-content count, never an invented
 * total. Test-mode banks are excluded: they're a single timed submission with
 * no per-item completion tracking, so including them would only ever dilute
 * the percentage with items that can never individually be marked done.
 */
export function getAllBankModuleItemIds(): { dayId: SsbDayId; moduleId: string; itemIds: string[] }[] {
  return getAllModules()
    .filter((m) => m.kind === "bank" && m.bank?.mode === "practice")
    .map((m) => ({
      dayId: m.dayId,
      moduleId: m.id,
      itemIds: (m.mcqItems ?? m.responseItems ?? []).map((item) => item.id),
    }));
}

const processedSubmissions = new Map<string, { submissionId: string; submittedAt: string }>();

export async function submitSsbBankTest(
  answers: Record<string, string>,
  idempotencyKey: string,
): Promise<ApiResult<{ submissionId: string; submittedAt: string }>> {
  const existing = processedSubmissions.get(idempotencyKey);
  if (existing) {
    return { ok: true, data: existing };
  }

  if (Object.keys(answers).length === 0) {
    return { ok: false, error: { code: "validation_error", message: "There's nothing to submit yet." } };
  }

  const result = { submissionId: idempotencyKey, submittedAt: new Date().toISOString() };
  processedSubmissions.set(idempotencyKey, result);
  return { ok: true, data: result };
}
