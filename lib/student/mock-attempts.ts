// Per-browser only, same pattern as practice-answers.ts: the latest mock
// interview / conference attempt, kept so the student can review it after a
// reload (specs.md §6.4b).
import type { GuidedPracticeItem } from "@/types/ssb-journey";

export type MockKind = "interview" | "conference";

export interface MockAttempt {
  completedAt: string;
  questions: GuidedPracticeItem[];
  answers: Record<string, string>;
  /** Self-review ticks per question id, filled in on the review screen. */
  selfReview: Record<string, string[]>;
}

export function mockAttemptKey(kind: MockKind): string {
  return `ssb-mock-attempt-${kind}`;
}

export function readMockAttempt(kind: MockKind): MockAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(mockAttemptKey(kind));
    return raw ? (JSON.parse(raw) as MockAttempt) : null;
  } catch {
    return null;
  }
}

export function writeMockAttempt(kind: MockKind, attempt: MockAttempt): MockAttempt {
  try {
    window.localStorage.setItem(mockAttemptKey(kind), JSON.stringify(attempt));
  } catch {
    // Private browsing / blocked storage — the review still shows for this
    // visit, it just won't survive a reload.
  }
  return attempt;
}
