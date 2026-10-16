// Role dashboards (specs.md §8a.4e, Phase 9). Every field comes from a real
// row — no readiness score (status.md Decisions, T088). Mission and streak
// come from saved practice (T083b).

import type { AttentionStudent, CategoryAverage, ProgressSummary, Recommendation } from "@/types/progress";
import type { JourneyMission } from "@/types/practice";
import type { SessionRecord } from "@/types/sessions";

export interface ActivityEntry {
  id: string;
  title: string;
  detail: string;
  at: string;
  href: string;
}

export interface StudentDashboard {
  firstName: string;
  summary: ProgressSummary;
  nextSession: SessionRecord | null;
  recommendations: Recommendation[];
  recentActivity: ActivityEntry[];
  /** The next self-paced practice bank to work on (Today's Mission). */
  mission: JourneyMission;
  /** Consecutive IST days with practice, ending today or yesterday. */
  streakDays: number;
}

export interface MenteeRow {
  studentId: string;
  name: string;
  batchName: string | null;
  avgScorePct: number | null;
  lastScorePct: number | null;
  trend: "up" | "down" | "flat" | null;
}

export interface MentorDashboard {
  firstName: string;
  menteeCount: number;
  sessionsNext7Days: number;
  pendingReviews: number;
  avgScorePct: number | null;
  todaysSessions: SessionRecord[];
  reviewQueue: { attemptId: string; studentName: string; assessmentTitle: string; submittedAt: string }[];
  mentees: MenteeRow[];
  attention: AttentionStudent[];
}

export interface MentorWorkload {
  mentorId: string;
  name: string;
  invited: boolean;
  batches: number;
  sessionsNext7Days: number;
  pendingReviews: number;
}

export interface AcademyDashboard {
  academyName: string;
  totalStudents: number;
  studentsInBatch: number;
  activeBatches: number;
  batchesWithoutMentor: number;
  mentorCount: number;
  pendingInvites: number;
  summary: ProgressSummary;
  pendingReviews: number;
  sessionsNext7Days: number;
  monthlyScores: { month: string; avgPct: number; count: number }[];
  categories: CategoryAverage[];
  scoreBuckets: { label: string; count: number }[];
  batches: { batchId: string; name: string; studentCount: number; avgScorePct: number | null }[];
  attention: AttentionStudent[];
  recentActivity: ActivityEntry[];
  upcomingSessions: SessionRecord[];
  mentors: MentorWorkload[];
  activeStudents14Days: number;
}
