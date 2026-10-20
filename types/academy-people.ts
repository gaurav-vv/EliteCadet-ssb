// Contract for an academy's own people (Phase 3, T082) — specs.md §8a.3c.
// Backed by the academy_students / batch_overview views and profiles
// (supabase/migrations/0007_batch_membership.sql).

import type { UserStatus } from "@/types/auth";

export interface AcademyStudentRecord {
  id: string;
  fullName: string;
  email: string | null;
  status: UserStatus;
  batchId: string | null;
  batchName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export type StudentBatchFilter = string; // "all" | "none" | batch uuid
export type StudentStatusFilter = UserStatus | "all";
export type StudentSortOption = "name" | "newest" | "oldest" | "last_login";

export interface AcademyStudentListParams {
  q: string;
  batch: StudentBatchFilter;
  status: StudentStatusFilter;
  sort: StudentSortOption;
  page: number;
}

export interface AcademyStudentListResult {
  rows: AcademyStudentRecord[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface AcademyStudentSummary {
  total: number;
  inBatch: number;
  withoutBatch: number;
  suspended: number;
}

export interface AcademyMentorRecord {
  id: string;
  fullName: string;
  email: string | null;
  status: UserStatus;
  // Never signed in yet = invite not accepted.
  invited: boolean;
  batches: { id: string; name: string }[];
}

export interface AcademyStudentDetail {
  student: AcademyStudentRecord;
  mentors: { id: string; name: string }[];
}
