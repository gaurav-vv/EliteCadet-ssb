import type { NavIconName } from "@/components/ui/nav-icons";

export type StudentStatus = "active" | "inactive";
export type MentorStatus = "invited" | "active";

export interface AcademyStudent {
  id: string;
  fullName: string;
  batchId: string | null;
  mentorId: string | null;
  status: StudentStatus;
  readiness: number | null;
  lastActivityAt: string | null;
}

export interface AcademyBatch {
  id: string;
  name: string;
  mentorId: string | null;
  studentIds: string[];
}

export interface AcademyMentor {
  id: string;
  fullName: string;
  email: string;
  status: MentorStatus;
  sessionsThisWeek: number;
  pendingEvaluations: number;
}

export interface AttentionStudent {
  studentId: string;
  fullName: string;
  reason: string;
}

export interface AcademyAlert {
  message: string;
}

export interface BatchPerformanceRow {
  batchId: string;
  name: string;
  studentCount: number;
  averageReadiness: number | null;
}

export interface MentorOverviewRow {
  mentorId: string;
  fullName: string;
  status: MentorStatus;
  assignedStudentCount: number;
}

export interface AcademyDashboardData {
  academyName: string;
  totalStudents: number;
  activeBatches: number;
  totalMentors: number;
  averageReadiness: number | null;
  batchPerformance: BatchPerformanceRow[];
  mentorOverview: MentorOverviewRow[];
  attentionStudents: AttentionStudent[];
  alerts: AcademyAlert[];
}

export interface StudentInput {
  fullName: string;
  batchId: string | null;
}

export interface BatchInput {
  name: string;
}

export interface MentorInviteInput {
  fullName: string;
  email: string;
}

export interface AcademySettings {
  academyName: string;
  contactEmail: string;
  adminName: string;
}

// Presentation view-model for the Academy dashboard (lib/academy/dashboard-view.ts).
// Derived only from AcademyDashboardData + the existing student/mentor read
// paths — nothing here is invented (AGENTS.md §8).
export type DashboardTone = "success" | "warning" | "danger" | "info" | "neutral";

export type DashboardIconTone = "indigo" | "success" | "warning" | "danger" | "info";

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: NavIconName;
  tone: DashboardIconTone;
  href: string;
}

export interface DashboardTask {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium";
  icon: "evaluations" | "attention" | "batches" | "mentors" | "sessions" | "activeStudents" | "readiness";
  tone: DashboardIconTone;
  href: string;
}

export interface DashboardActivity {
  studentId: string;
  fullName: string;
  description: string;
  occurredAt: string;
  badge: { label: string; tone: DashboardTone };
}

export interface DashboardViewModel {
  metrics: DashboardMetric[];
  tasks: DashboardTask[];
  activity: DashboardActivity[];
}

// Analytics the dashboard shows that the current backend cannot compute yet
// (no assessment-score history, skill-category scores or session schedule).
// `source: "demo"` means the values are placeholders and the UI must say so
// (AGENTS.md §8). When real tables exist, getAnalytics() returns
// source: "live" with the same shape and no component changes.
export type AnalyticsSource = "demo" | "live";

export interface PerformanceTrendPoint {
  month: string;
  overall: number;
  tatWatSrt: number;
  ppdtGd: number;
}

export interface AssessmentInsight {
  skill: string;
  academyAverage: number;
  benchmark: number;
}

export interface UpcomingSession {
  id: string;
  time: string;
  dayLabel: string;
  title: string;
  batchName: string;
  mentorName: string;
}

export interface AcademyAnalytics {
  source: AnalyticsSource;
  performanceTrend: PerformanceTrendPoint[];
  assessmentInsights: AssessmentInsight[];
  upcomingSessions: UpcomingSession[];
}

// ---- Academy students (Supabase: public.academy_students) ----

// `StudentStatus` ("active" | "inactive") above is the existing convention and
// matches the academy_student_status enum in the database.
export interface StudentRecord {
  id: string;
  fullName: string;
  status: StudentStatus;
  batchId: string | null;
  // Joined from batches; null when the student has no batch.
  batchName: string | null;
  createdAt: string;
}

// A batch the admin can pick for a student (all of the academy's batches; only
// active ones can receive students).
export interface StudentBatchOption {
  id: string;
  name: string;
  status: BatchStatus;
}

export type StudentStatusFilter = StudentStatus | "all";
export type StudentSort = "name" | "newest" | "oldest";

export interface StudentListParams {
  q: string;
  status: StudentStatusFilter;
  // "all" = any batch, "none" = no batch, otherwise a batch id.
  batch: string;
  sort: StudentSort;
  page: number;
}

export interface StudentListResult {
  rows: StudentRecord[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface StudentSummary {
  total: number;
  active: number;
  withoutBatch: number;
}

// What the add/edit form submits (validated by lib/academy/student-validation.ts).
export interface StudentFormInput {
  fullName: string;
  batchId: string | null;
  status: StudentStatus;
}

// ---- Batches management (Supabase-backed: supabase/migrations/0003_batches.sql) ----

// Named BatchRecord (not Batch) because `AcademyBatch` above is the in-memory
// model still used by the dashboard and Students pages.
export type BatchStatus = "active" | "archived";

export interface BatchRecord {
  id: string;
  name: string;
  status: BatchStatus;
  // ISO date (yyyy-mm-dd) or null when no start date was set.
  startDate: string | null;
  createdAt: string;
  mentorId: string | null;
  // Joined from profiles; null when the batch has no mentor.
  mentorName: string | null;
}

export interface BatchMentorOption {
  id: string;
  name: string;
}

export type BatchStatusFilter = BatchStatus | "all";
export type BatchSort = "name" | "newest" | "oldest";

export interface BatchListParams {
  q: string;
  // "all" = any mentor, "none" = no mentor, otherwise a mentor profile id.
  mentor: string;
  status: BatchStatusFilter;
  sort: BatchSort;
  page: number;
}

export interface BatchListResult {
  rows: BatchRecord[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface BatchSummary {
  total: number;
  active: number;
  // Active batches with no mentor assigned.
  withoutMentor: number;
}

// What the create/edit form submits (validated by lib/academy/batch-validation.ts).
export interface BatchFormInput {
  name: string;
  mentorId: string | null;
  startDate: string | null;
}
