// Practice domain types (T032/T033, T083b). Question banks live in Postgres
// (practice_banks / practice_items, 0014); the browser only ever sees an
// item's stable `key` as its id.

import type { GuidedPracticeItem, McqItem } from "@/types/ssb-journey";

export type PsychologyTestType = "tat" | "wat" | "srt" | "sdt";

export interface PracticeItem {
  id: string;
  /** The stimulus shown to the student: a scene description (TAT), a word (WAT), a situation (SRT), or a prompt (SDT). */
  prompt: string;
}

export type PracticeItemKind = "response" | "mcq";

export interface PracticeBank {
  slug: string;
  title: string;
  kind: PracticeItemKind;
  /** `mcq` banks: McqItem; `response` banks: GuidedPracticeItem. Ids are item keys. */
  items: (McqItem | GuidedPracticeItem)[];
}

export interface SavedPracticeAnswer {
  text: string;
  optionId: string | null;
  selfReview: string[];
  done: boolean;
  updatedAt: string;
}

export interface AnswerPatch {
  text?: string;
  optionId?: string | null;
  selfReview?: string[];
  done?: boolean;
}

export interface AttemptAnswer {
  /** Item key; omitted for a mock run's own (PIQ) question, which then carries its prompt. */
  key?: string;
  prompt?: string;
  response?: string;
  optionId?: string;
}

export interface AttemptResult {
  id: string;
  correct: number | null;
  total: number;
  submittedAt: string;
}

export interface MockAttemptRecord {
  id: string;
  completedAt: string;
  questions: GuidedPracticeItem[];
  answers: Record<string, string>;
  selfReview: Record<string, string[]>;
}

export interface BankProgress {
  done: number;
  total: number;
}

export interface JourneyDayProgress {
  dayId: string;
  dayNumber: number;
  title: string;
  done: number;
  total: number;
}

/** The next self-paced bank to work on; "all-done" when finished; null when there's nothing to practise. */
export type JourneyMission = { dayNumber: number; title: string; href: string; done: number; total: number } | "all-done" | null;

// Mentor view of a mentee's practice (answers readable by their mentors).
export interface MenteePracticeAnswer {
  bankTitle: string;
  prompt: string;
  answer: string;
  done: boolean;
  updatedAt: string;
}

export interface MenteePracticeAttempt {
  id: string;
  bankTitle: string;
  mode: "test" | "mock";
  correct: number | null;
  total: number;
  submittedAt: string;
}

// Super Admin bank editing.
export interface AdminBankSummary {
  slug: string;
  title: string;
  kind: PracticeItemKind;
  active: number;
  inactive: number;
}

export interface AdminPracticeItem {
  id: string;
  key: string;
  position: number;
  prompt: string;
  options: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  guidance: { assesses: string; tips: string[] } | null;
  active: boolean;
}

export interface PracticeItemInput {
  prompt: string;
  /** MCQ: one option per line. */
  options: string;
  /** MCQ: 1-based number of the correct option. */
  correct: string;
  /** Free text: what the question checks (optional, with tips). */
  assesses: string;
  /** Free text: one tip per line. */
  tips: string;
}
