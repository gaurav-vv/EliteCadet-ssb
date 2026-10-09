// Student onboarding validation and submission. The dashboard reads real data
// from lib/server/dashboards (Phase 9, T088).

import type { OnboardingInput } from "@/types/student";

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
