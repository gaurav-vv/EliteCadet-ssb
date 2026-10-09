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

// ---- Students list (lib/academy/student-list.ts) ----

// A student's displayed state, derived from real fields only:
//  - "inactive":  status === "inactive"
//  - "attention": active, but flagged by the existing attention rules
//                 (no practice since joining, or no activity for 4+ days)
//  - "active":    everything else
export type StudentDisplayStatus = "active" | "inactive" | "attention";

export interface StudentRow {
  id: string;
  fullName: string;
  initials: string;
  batchId: string | null;
  batchName: string | null;
  mentorId: string | null;
  mentorName: string | null;
  // 0–100, or null when the student has not been assessed yet (never invented).
  readiness: number | null;
  lastActivityAt: string | null;
  status: StudentDisplayStatus;
  // Why the student needs attention (existing rule); null otherwise.
  attentionReason: string | null;
}

export type StudentStatusFilter = StudentDisplayStatus | "all";
export type StudentPerformanceFilter = "below60" | "60to79" | "80plus" | "unassessed" | "all";
export type StudentSort = "name" | "recent" | "performance" | "activity";

export interface StudentListParams {
  q: string;
  status: StudentStatusFilter;
  // "all" = no filter, "none" = unassigned, otherwise an id.
  batch: string;
  mentor: string;
  performance: StudentPerformanceFilter;
  sort: StudentSort;
  page: number;
}

export interface StudentListResult {
  rows: StudentRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface StudentSummary {
  total: number;
  active: number;
  withoutBatch: number;
  needingAttention: number;
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
  // From batch_mentors (any number), ordered by name.
  mentors: BatchMentorOption[];
  studentCount: number;
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
  startDate: string | null;
}

// One student row in a batch roster / the academy's student list
// (public.academy_students view, supabase/migrations/0007_batch_membership.sql).
export interface BatchStudent {
  id: string;
  fullName: string;
  email: string | null;
}

export interface BatchDetail {
  batch: BatchRecord;
  students: BatchStudent[];
  // Academy students not in any batch — candidates to add.
  availableStudents: BatchStudent[];
  // Academy mentors not yet on this batch — candidates to assign.
  availableMentors: BatchMentorOption[];
}
