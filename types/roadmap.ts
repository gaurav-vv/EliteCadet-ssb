// Personalised roadmap (T105, PRD §13.3–13.6, FR-PLAN-01, FR-DASH-01).
// Recomputed from the latest evidence on every view, so it always reflects
// new assessments; every item says why.

import type { ReadinessDimensionId, ReadinessState } from "@/types/readiness";

export type RoadmapStageId = "exploration" | "foundation" | "core_preparation" | "advanced_practice" | "mock_readiness" | "final_revision";

export interface RoadmapAction {
  title: string;
  reason: string;
  href: string;
}

export interface RoadmapFocus {
  dimension: ReadinessDimensionId;
  name: string;
  state: ReadinessState;
  why: string;
  action: RoadmapAction;
}

export interface Roadmap {
  stage: { id: RoadmapStageId; label: string; explanation: string };
  selfReportedStage: string | null;
  daysToTarget: number | null;
  focus: RoadmapFocus[];
  weekPlan: { label: string; minutes: number }[];
  /** Daily Mission: a short, ranked list (at most three). */
  today: RoadmapAction[];
  basedOn: string[];
}
