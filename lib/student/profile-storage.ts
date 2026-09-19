// Per-browser only until real accounts exist (T013/T014 deferred — status.md,
// 2026-09-18). Real, account-scoped profile storage replaces this later.
import type { OnboardingInput } from "@/types/student";

export const PROFILE_KEY = "ssb-student-profile";

export function readStoredProfile(): OnboardingInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingInput) : null;
  } catch {
    return null;
  }
}

export function writeStoredProfile(profile: OnboardingInput): void {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing / blocked storage — edits still work for this render,
    // they just won't persist across a refresh.
  }
}
