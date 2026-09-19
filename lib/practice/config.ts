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
