// AI practice evaluations as the app shows them (T101/T102, specs.md §0.1).
// Always labelled "AI-generated practice evaluation" — never an SSB result.

export type AiRating = "needs_attention" | "developing" | "strong";
export type AiConfidence = "low" | "medium" | "high";

export interface AiDimension {
  id: string;
  name: string;
  rating: AiRating;
  confidence: AiConfidence;
  evidence: string[];
  note: string;
}

export interface AiFeedback {
  observation: string;
  evidence: string;
  impact: string;
  improvementAction: string;
  recommendedPractice: string;
}

export interface AiEvaluation {
  label: string;
  dimensions: AiDimension[];
  feedback: AiFeedback;
  overallConfidence: AiConfidence;
  createdAt: string;
}

/** pending: queued or being prepared · ready · unavailable: gave up · none: nothing to evaluate. */
export type AiFeedbackState = { status: "pending" } | { status: "ready"; evaluation: AiEvaluation } | { status: "unavailable" } | { status: "none" };

export interface PsychologyAttemptView {
  id: string;
  test: "tat" | "wat" | "srt" | "sdt";
  title: string;
  submittedAt: string;
  items: { prompt: string; response: string }[];
  feedback: AiFeedbackState;
}

export interface PsychologyAttemptSummary {
  id: string;
  test: "tat" | "wat" | "srt" | "sdt";
  title: string;
  submittedAt: string;
  answered: number;
  total: number;
  feedback: AiFeedbackState["status"];
}
