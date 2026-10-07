// Contract for progress (Phase 8, T087) — specs.md §8a.4d. Derived from real
// rows (student_scores / student_progress views, 0012_progress.sql); every
// figure carries its basis, and null means "not enough data yet".

import type { ContentCategory } from "@/types/content";

export interface ScorePoint {
  assessmentId: string;
  title: string;
  category: ContentCategory;
  scorePct: number;
  score: number;
  maxScore: number;
  reviewedAt: string;
  improvementAreas: string | null;
  strengths: string | null;
}

export interface CategoryAverage {
  category: ContentCategory;
  avgPct: number;
  count: number;
}

export interface ProgressSummary {
  reviewedCount: number;
  avgScorePct: number | null;
  sessionsPresent: number;
  sessionsAbsent: number;
  attendancePct: number | null;
  contentCompleted: number;
  lastSubmissionAt: string | null;
}

export interface Recommendation {
  title: string;
  reason: string;
  href: string;
}

export interface StudentProgress {
  summary: ProgressSummary;
  trend: ScorePoint[];
  categories: CategoryAverage[];
  strength: CategoryAverage | null;
  weakArea: CategoryAverage | null;
  recentFeedback: ScorePoint[];
}

export interface BatchPerformance {
  batchId: string;
  batchName: string;
  students: number;
  avgScorePct: number | null;
  attendancePct: number | null;
  reviewedCount: number;
}

export interface AttentionStudent {
  studentId: string;
  name: string;
  batchName: string | null;
  reason: string;
}

export type AttendanceStatus = "present" | "absent" | "excused";
