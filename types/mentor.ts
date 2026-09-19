export type EvaluationStatus = "none" | "pending" | "in_review" | "reviewed";

export interface MenteeSummary {
  id: string;
  fullName: string;
  batch: string;
  overallScore: number | null;
  weakAreas: string[];
  evaluationStatus: EvaluationStatus;
  lastActivityAt: string | null;
}

export interface MenteeActivityItem {
  id: string;
  title: string;
  category: string;
  completedAt: string;
}

export interface MentorFeedbackNote {
  id: string;
  comment: string;
  createdAt: string;
}

export interface MenteeDetail extends MenteeSummary {
  academyName: string | null;
  targetExam: string;
  activity: MenteeActivityItem[];
  mentorFeedback: MentorFeedbackNote[];
}

export interface Evaluation {
  id: string;
  menteeId: string;
  menteeName: string;
  activityOrSession: string;
  score: number;
  strengths: string;
  improvementAreas: string;
  comments: string;
  status: EvaluationStatus;
  evaluatorName: string;
  createdAt: string;
}

export interface EvaluationInput {
  menteeId: string;
  activityOrSession: string;
  score: number;
  strengths: string;
  improvementAreas: string;
  comments: string;
}

export interface ScheduleItem {
  title: string;
  withName: string;
  scheduledFor: string;
}

export interface MenteeProgressRow {
  menteeId: string;
  fullName: string;
  trend: "up" | "down" | "flat";
  score: number | null;
}

export interface AttentionMentee {
  menteeId: string;
  fullName: string;
  reason: string;
}

export interface RecentEvaluationRow {
  menteeName: string;
  activity: string;
  score: number;
  createdAt: string;
}

export interface MentorDashboardData {
  mentorName: string;
  totalMentees: number;
  sessionsThisWeek: number;
  pendingEvaluations: number;
  averageMenteeScore: number | null;
  todaysSchedule: ScheduleItem[];
  menteeProgressOverview: MenteeProgressRow[];
  recentEvaluations: RecentEvaluationRow[];
  attentionMentees: AttentionMentee[];
}

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export interface MentorSession {
  id: string;
  title: string;
  menteeId: string;
  menteeName: string;
  scheduledFor: string;
  status: SessionStatus;
}

export interface SessionInput {
  title: string;
  menteeId: string;
  scheduledFor: string;
}
