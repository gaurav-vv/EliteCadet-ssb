// Practice Zone domain types (T032/T033). Working API contract per
// AGENTS.md §9 — lib/api/practice.ts is written against these shapes so a
// real backend can replace lib/mock/practice.ts without touching components.

export type PsychologyTestType = "tat" | "wat" | "srt" | "sdt";

export interface PracticeActivitySummary {
  testType: PsychologyTestType;
  title: string;
  description: string;
  itemCount: number;
  durationLabel: string;
}

export interface PracticeItem {
  id: string;
  /** The stimulus shown to the student: a scene description (TAT), a word (WAT), a situation (SRT), or a prompt (SDT). */
  prompt: string;
}

export interface PracticeResponseItem {
  itemId: string;
  response: string;
}

export interface PracticeSubmissionInput {
  testType: PsychologyTestType;
  responses: PracticeResponseItem[];
}

export interface PracticeSubmissionResult {
  submissionId: string;
  submittedAt: string;
}
