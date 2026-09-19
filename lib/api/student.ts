// Typed API client for the student domain (AGENTS.md §9) — the only place
// student data is fetched from. Currently backed by lib/mock/student.ts
// (pre-auth, pre-backend build-out — see status.md → Decisions, 2026-09-18).
// Swapping in a real backend later means changing the bodies of these
// functions only; no caller changes.

import { getMockDashboardData } from "@/lib/mock/student";
import type { OnboardingInput, StudentDashboardData } from "@/types/student";

export interface ApiError {
  code: "validation_error" | "network_error" | "server_error";
  message: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export function validateOnboardingInput(input: OnboardingInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.fullName.trim()) {
    errors.fullName = "Your name is required.";
  }
  if (!input.goals.trim()) {
    errors.goals = "Tell us at least one preparation goal.";
  } else if (input.goals.trim().length < 10) {
    errors.goals = "Add a bit more detail — a few words isn't enough to personalize your plan.";
  }

  return errors;
}

export async function submitOnboarding(input: OnboardingInput): Promise<ApiResult<null>> {
  const fieldErrors = validateOnboardingInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: { code: "validation_error", message: Object.values(fieldErrors)[0] },
    };
  }

  // No backend yet — persisted client-side in components/student/onboarding-form.tsx
  // via localStorage. Real submission (POST /api/students/onboarding) lands with T013/T014.
  return { ok: true, data: null };
}

export async function getDashboardData(
  variant: "empty" | "active" = "empty",
): Promise<ApiResult<StudentDashboardData>> {
  return { ok: true, data: getMockDashboardData(variant) };
}
