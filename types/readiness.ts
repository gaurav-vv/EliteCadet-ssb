// Readiness profile (T104, PRD §11.8, specs.md §0.1): a state per dimension
// with its evidence and confidence — never a single number.

export type ReadinessDimensionId = "communication" | "self_awareness" | "interview" | "psychology" | "gto" | "revision" | "consistency";
export type ReadinessState = "strong" | "improving" | "developing" | "needs_attention" | "not_enough_evidence";
export type ReadinessConfidence = "low" | "medium" | "high";

export interface ReadinessDimension {
  id: ReadinessDimensionId;
  name: string;
  state: ReadinessState;
  confidence: ReadinessConfidence;
  /** Plain-language reasons; empty for audiences that see states only. */
  evidence: string[];
  /** What would help next, for the student. */
  next: string | null;
}

export interface ReadinessProfile {
  dimensions: ReadinessDimension[];
  generatedAt: string;
}

// Raw signals from public.readiness_signals() (0020): counts and averages only.
export interface ReadinessSignals {
  accountCreatedAt: string | null;
  mentor: { category: string; n: number; avgPct: number | null; recentAvg: number | null; previousAvg: number | null }[];
  ai: { rubricId: string; dimension: string; rating: "strong" | "developing" | "needs_attention"; confidence: "low" | "medium" | "high"; recent: boolean; n: number }[];
  practice: { done28d: number; tests28d: number; interviews28d: number; repeatsAfterFeedback28d: number };
  library28d: number;
  attendance: { present: number; absent: number };
  activeDays28: number;
  activeDays7: number;
}
