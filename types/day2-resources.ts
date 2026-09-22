// Day 2 Psychology external resource library — typed contract for the curated,
// human-verified list in lib/mock/day2-resources.ts (sourced from
// docs/day2-final-curated-resources.md; do not add entries here without a
// matching, verified entry in that research document).

export type Day2TestCategory = "tat" | "wat" | "srt" | "sdt" | "full-day-2";

export type Day2ResourcePurpose =
  | "learn"
  | "example"
  | "practice"
  | "timed-practice"
  | "test-series"
  | "full-mock"
  | "feedback"
  | "supporting";

export type Day2ResourceType =
  | "article"
  | "video"
  | "web-app"
  | "mobile-app"
  | "simulator"
  | "test"
  | "pdf"
  | "book"
  | "course";

export type Day2AccessType = "free" | "freemium" | "paid" | "unknown";

export type Day2FeedbackKind = "human" | "ai";

export interface Day2Resource {
  id: string;
  name: string;
  /** Original, factual one-to-two sentence description — never copied from the source site. */
  description: string;
  category: Day2TestCategory;
  purpose: Day2ResourcePurpose[];
  resourceType: Day2ResourceType;
  url: string;
  platform: string;
  accessType: Day2AccessType;
  loginRequired: boolean | "unknown";
  /** Verified timing statement, or null if not verified/not applicable. */
  timing: string | null;
  /** Verified set/item count statement, or null if not verified/not applicable. */
  setCount: string | null;
  /** Short factual note on how/whether this was verified — shown to students as a trust signal. */
  verificationStatus: string;
  copyrightNote: string;
  /** Present only for resources whose primary purpose includes feedback. */
  feedbackKind?: Day2FeedbackKind;
  /** Present only for feedbackKind "ai" — confidence rating from the v2 research, never omitted for AI entries. */
  aiFeedbackConfidence?: string;
  tags: string[];
  /** A small, deliberately short set of resources surfaced in "Start Here". */
  featured?: boolean;
  external: true;
}
