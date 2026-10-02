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
