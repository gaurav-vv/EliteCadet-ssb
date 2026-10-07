// Contract for User Management (Phase 1, T080) — specs.md §8a.3.
// Backed by public.profiles (supabase/migrations/0005_users_rbac.sql).

import type { Role, UserStatus } from "@/types/auth";

export interface UserRecord {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  academyId: string | null;
  academyName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export type UserRoleFilter = Role | "all";
export type UserStatusFilter = UserStatus | "all";
export type UserSort = "newest" | "oldest" | "name" | "last_login";

export interface UserListParams {
  q: string;
  role: UserRoleFilter;
  status: UserStatusFilter;
  sort: UserSort;
  page: number;
}

export interface UserListResult {
  rows: UserRecord[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface PlatformUserSummary {
  total: number;
  students: number;
  mentors: number;
  academyAdmins: number;
  superAdmins: number;
  suspended: number;
  academies: number;
}

export interface AuditEntry {
  id: number;
  actorName: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}
