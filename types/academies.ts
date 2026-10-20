// Contract for academy management (Phase 2, T081) — specs.md §8a.3b.
// Backed by public.academies (supabase/migrations/0006_academies.sql).
// (types/academy.ts is the older in-memory Academy-dashboard contract.)

import type { Role, UserStatus } from "@/types/auth";

export type AcademyStatus = "active" | "suspended";

export interface AcademyRecord {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: AcademyStatus;
  createdAt: string;
}

export interface AcademyMemberCounts {
  admins: number;
  mentors: number;
  students: number;
}

export interface AcademyListRow extends AcademyRecord {
  counts: AcademyMemberCounts;
}

export type AcademyStatusFilter = AcademyStatus | "all";
export type AcademySort = "newest" | "oldest" | "name";

export interface AcademyListParams {
  q: string;
  status: AcademyStatusFilter;
  sort: AcademySort;
  page: number;
}

export interface AcademyListResult {
  rows: AcademyListRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface AcademyInput {
  name: string;
  description: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
}

export interface AcademyMember {
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
  status: UserStatus;
}

export type MemberRole = Extract<Role, "student" | "mentor" | "academy_admin">;

export interface AcademyOption {
  id: string;
  name: string;
}
