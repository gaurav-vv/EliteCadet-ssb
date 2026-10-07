import type { NavIconName } from "@/components/ui/nav-icons";

// Presentation types for the Academy dashboard (lib/academy/dashboard-view.ts),
// built only from getAcademyDashboard — nothing here is invented (AGENTS.md §8).
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

// ---- Batches management (Supabase-backed: supabase/migrations/0003_batches.sql) ----

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
