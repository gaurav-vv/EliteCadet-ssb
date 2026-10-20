// Role-based access control — pure rules, no I/O (tests/unit/lib/rbac.test.ts).
// This is the application half of authorization; Postgres RLS is the other
// half (supabase/migrations/0005_users_rbac.sql). Both must agree.
//
// Authorization chain (specs.md §8a): authentication → role → academy →
// batch → assignment → resource. Phase 1 covers authentication + role; later
// phases add academy/batch/assignment scope checks in their own modules.

import type { Role } from "@/types/auth";

export type Permission =
  | "users.read"
  | "users.change_role"
  | "users.change_status"
  | "academies.read_all"
  | "academies.manage"
  | "academy.update_own"
  | "content.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ["users.read", "users.change_role", "users.change_status", "academies.read_all", "academies.manage", "content.manage", "audit.read"],
  academy_admin: ["academy.update_own"],
  mentor: [],
  student: [],
};

export const ROLES: readonly Role[] = ["student", "mentor", "academy_admin", "super_admin"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

// Each role's workspace — one app, role-scoped sections (specs.md §8a.2).
export const WORKSPACE_PATH: Record<Role, string> = {
  student: "/student",
  mentor: "/mentor",
  academy_admin: "/academy",
  super_admin: "/admin",
};

// Roles that must belong to an academy to be meaningful.
export function roleRequiresAcademy(role: Role): boolean {
  return role === "mentor" || role === "academy_admin";
}
