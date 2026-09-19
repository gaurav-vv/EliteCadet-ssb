// Per-browser only until real accounts exist (T013/T014 deferred — status.md,
// 2026-09-18).
export const MENTOR_PROFILE_KEY = "ssb-mentor-profile";

export interface MentorProfileInput {
  fullName: string;
  specialization: string;
  bio: string;
}

export function readStoredMentorProfile(): MentorProfileInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MENTOR_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as MentorProfileInput) : null;
  } catch {
    return null;
  }
}

export function writeStoredMentorProfile(profile: MentorProfileInput): void {
  try {
    window.localStorage.setItem(MENTOR_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing / blocked storage — edits still work for this render.
  }
}
