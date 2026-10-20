import type { AiFeedbackState } from "@/types/ai";

// The starting-point diagnostic (T105, PRD §9.3). The first attempt is the
// baseline and never changes; later attempts are re-assessments.

export type DiagnosticSection = "knowledge" | "reasoning" | "communication" | "situational_reasoning" | "self_awareness";

export interface DiagnosticFormItem {
  key: string;
  section: DiagnosticSection;
  prompt: string;
  /** Multiple choice only. Correct answers are never sent to the browser. */
  options: { id: string; label: string }[] | null;
}

export interface SectionScore {
  correct: number;
  total: number;
}

export interface DiagnosticView {
  id: string;
  kind: "baseline" | "reassessment";
  submittedAt: string;
  knowledge: SectionScore;
  reasoning: SectionScore;
  multipleChoice: { prompt: string; correct: boolean; answered: boolean }[];
  written: { section: DiagnosticSection; prompt: string; response: string }[];
  feedback: AiFeedbackState;
}

export interface DiagnosticSummary {
  id: string;
  kind: "baseline" | "reassessment";
  submittedAt: string;
  knowledge: SectionScore;
  reasoning: SectionScore;
  /** AI ratings for the written part, by dimension id; empty until feedback is ready. */
  written: Record<string, "strong" | "developing" | "needs_attention">;
}

export interface DiagnosticOverview {
  baseline: DiagnosticSummary | null;
  /** The most recent re-assessment, if any. */
  latest: DiagnosticSummary | null;
  /** When the next attempt is allowed (once a week); null = now. */
  nextAllowedAt: string | null;
}
