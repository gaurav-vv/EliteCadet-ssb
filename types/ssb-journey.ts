// 5-Day SSB Practice Journey domain types (T039). Working API contract per
// AGENTS.md §9 — lib/api/ssb-journey.ts is written against these shapes so a
// real backend/content pipeline can replace lib/mock/ssb-journey.ts without
// touching components. Reuses types/practice.ts's PracticeItem shape for
// free-text bank content instead of redefining it.

import type { NavIconName } from "@/components/ui/nav-icons";
import type { PracticeItem } from "@/types/practice";
import type { CarouselTiming } from "@/lib/practice/config";

export type SsbDayId = "day-1" | "day-2" | "day-3" | "day-4" | "day-5";

export interface SsbDaySummary {
  id: SsbDayId;
  dayNumber: number;
  title: string;
  description: string;
  /** A short paragraph shown on the day's own page, under the one-line description — more context than fits on the Practice overview's list row. */
  longDescription: string;
}

// "reading"/"info": static content, no completion tracking (matches the
// reference product, which only tracks progress on bank-backed modules).
// "bank": a set of items answered practice-style (untimed, incremental,
// browsed at the student's own pace) or test-style (timed, single sitting —
// test-mode banks always route to an existing dedicated page via `href`,
// e.g. the Psychology tests or Interview practice, rather than duplicating
// that flow here).
// "checklist": a self-assessment the student fills in once, not a question bank.
// "summary": the Day 5 aggregate progress view.
export type SsbModuleKind = "reading" | "info" | "bank" | "checklist" | "summary";
export type SsbBankItemKind = "mcq" | "response";
export type SsbBankMode = "practice" | "test";

export interface SsbBankMeta {
  itemKind: SsbBankItemKind;
  mode: SsbBankMode;
  /** Real item ids from the actual dummy content bank — only present for banks without an `href` override, since those render this app's own progress-tracked UI. Used to compute "X of N done" without shipping the full item content to the list page. */
  itemIds?: string[];
}

export interface SsbModuleSummary {
  id: string;
  dayId: SsbDayId;
  title: string;
  description: string;
  icon: NavIconName;
  kind: SsbModuleKind;
  /** When set, this module links straight to an existing dedicated route (e.g. an already-built Psychology test) instead of the generic module page. */
  href?: string;
  bank?: SsbBankMeta;
  /** "info"-kind modules only: a short at-a-glance caption for the day grid card, e.g. "~10-15 min · Group task". */
  durationLabel?: string;
}

export interface McqOption {
  id: string;
  label: string;
}

export interface McqItem {
  id: string;
  prompt: string;
  options: McqOption[];
  correctOptionId: string;
}

export interface SsbReadingContent {
  body: string;
  articles?: { title: string; body: string }[];
}

export interface SsbInfoContent {
  overview: string;
  tips: string[];
  /** Short at-a-glance caption, e.g. "~10-15 min · Group of 8-10, no leader" — also copied onto the module summary's `durationLabel` for the day grid card. */
  durationLabel?: string;
}

export interface SsbModuleDetail extends SsbModuleSummary {
  reading?: SsbReadingContent;
  info?: SsbInfoContent;
  mcqItems?: McqItem[];
  responseItems?: PracticeItem[];
  /** Only set for the one response-kind test module (PPDT) — every other response test reuses an existing dedicated route via `href` instead. */
  carouselTiming?: CarouselTiming;
  /** A short "why this matters" line shown above bank/checklist/summary content — the equivalent of reading/info's `overview` for module kinds that otherwise jump straight into the interactive UI. */
  context?: string;
}
