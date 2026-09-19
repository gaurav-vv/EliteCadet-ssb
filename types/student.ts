// Types for the student domain. These are the working API contract per
// AGENTS.md §9 until a real backend exists — lib/api/student.ts is written
// against these shapes so a real fetch implementation can replace
// lib/mock/student.ts without any component changing.

export type PreparationStage = "just_starting" | "in_progress" | "final_stretch";

export type TargetExam = "cds" | "afcat" | "nda" | "ssc" | "other";

export interface OnboardingInput {
  fullName: string;
  targetExam: TargetExam;
  preparationStage: PreparationStage;
  academyName: string | null;
  goals: string;
}

export interface StudentProfile {
  fullName: string;
  targetExam: TargetExam;
  preparationStage: PreparationStage;
  academyName: string | null;
  goals: string;
  onboardedAt: string;
}

export interface ReadinessSummary {
  score: number;
  basis: string;
}

export interface ActivityMetrics {
  practicesCompleted: number;
  sessionsAttended: number;
}

export interface MissionItem {
  title: string;
  description: string;
  href: string;
}

export interface UpcomingSession {
  title: string;
  withName: string;
  scheduledFor: string;
}

export interface SkillTrendPoint {
  label: string;
  value: number;
}

export interface ProgressSummary {
  skillArea: string;
  trend: SkillTrendPoint[];
}

export interface RecentActivityItem {
  id: string;
  title: string;
  category: string;
  completedAt: string;
}

export interface Recommendation {
  title: string;
  reason: string;
  href: string;
}

export interface StudentDashboardData {
  profile: StudentProfile;
  readiness: ReadinessSummary | null;
  activity: ActivityMetrics;
  todaysMission: MissionItem | null;
  upcomingSession: UpcomingSession | null;
  progress: ProgressSummary | null;
  recentActivity: RecentActivityItem[];
  recommendations: Recommendation[];
}
