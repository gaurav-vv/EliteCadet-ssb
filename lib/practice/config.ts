// Standard SSB timing per blocker B4 (status.md → Decisions, 2026-09-18).
// "carousel" tests auto-advance item by item on a per-item timer; "budget"
// tests give one countdown across every item and let the student navigate
// freely within it.

import type { PsychologyTestType } from "@/types/practice";

export interface CarouselTiming {
  mode: "carousel";
  /** TAT only: seconds the stimulus is shown before the response phase opens. */
  stimulusSeconds?: number;
  /** Seconds available to respond to each item. */
  responseSeconds: number;
}

export interface BudgetTiming {
  mode: "budget";
  /** Total seconds shared across every item in the activity. */
  totalSeconds: number;
}

export type TimingConfig = CarouselTiming | BudgetTiming;

export const PRACTICE_TIMING: Record<PsychologyTestType, TimingConfig> = {
  tat: { mode: "carousel", stimulusSeconds: 30, responseSeconds: 240 },
  wat: { mode: "carousel", responseSeconds: 15 },
  srt: { mode: "budget", totalSeconds: 30 * 60 },
  sdt: { mode: "budget", totalSeconds: 15 * 60 },
};

// Mock interview / conference pacing (specs.md §6.4b). These are practice
// values chosen for this app, not official SSB timings: the real interview
// and conference aren't run to a per-question clock.
export interface MockSessionConfig {
  questionCount: number;
  secondsPerQuestion: number;
  /** How many of the questions may come from the student's PIQ (interview only). */
  maxPiqQuestions: number;
  /** Always asked first when present, e.g. "Tell us about yourself". */
  openingQuestionId?: string;
}

export const MOCK_SESSIONS: Record<"interview" | "conference", MockSessionConfig> = {
  interview: { questionCount: 8, secondsPerQuestion: 120, maxPiqQuestions: 3, openingQuestionId: "int-1" },
  conference: { questionCount: 4, secondsPerQuestion: 60, maxPiqQuestions: 0 },
};

// Per-bank timer overrides (T102, FR-PSY-01): stored on practice_banks.timing
// and validated here at the boundary; anything malformed falls back to the
// standard timing above.
export function parseTiming(raw: unknown): TimingConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : null);
  if (r.mode === "carousel") {
    const responseSeconds = int(r.responseSeconds, 5, 900);
    const stimulusSeconds = r.stimulusSeconds === undefined ? undefined : int(r.stimulusSeconds, 0, 120);
    if (responseSeconds === null || stimulusSeconds === null) return null;
    return stimulusSeconds ? { mode: "carousel", stimulusSeconds, responseSeconds } : { mode: "carousel", responseSeconds };
  }
  if (r.mode === "budget") {
    const totalSeconds = int(r.totalSeconds, 60, 7200);
    return totalSeconds === null ? null : { mode: "budget", totalSeconds };
  }
  return null;
}

export function timingFor(testType: PsychologyTestType, override: TimingConfig | null | undefined): TimingConfig {
  return override ?? PRACTICE_TIMING[testType];
}

const minutes = (s: number) => (s % 60 === 0 ? `${s / 60} min` : `${Math.round((s / 60) * 10) / 10} min`);

export function timingLabel(t: TimingConfig): string {
  if (t.mode === "budget") return `${minutes(t.totalSeconds)} total`;
  const write = t.responseSeconds >= 60 ? `${minutes(t.responseSeconds)} write` : `${t.responseSeconds}s`;
  return t.stimulusSeconds ? `${t.stimulusSeconds}s view + ${write}, per picture` : `${write} per item`;
}
