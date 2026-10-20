// User Management input parsing — pure (tests/unit/lib/users-validation.test.ts).

import { isRole, roleRequiresAcademy } from "@/lib/server/permissions/rbac";
import type { Role, UserStatus } from "@/types/auth";
import type { UserListParams, UserRoleFilter, UserSort, UserStatusFilter } from "@/types/users";

export const USER_PAGE_SIZE = 20;

export const DEFAULT_USER_PARAMS: UserListParams = { q: "", role: "all", status: "all", sort: "newest", page: 1 };

const STATUS_FILTERS: readonly UserStatusFilter[] = ["all", "active", "suspended"];
const SORTS: readonly UserSort[] = ["newest", "oldest", "name", "last_login"];

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isUserStatus(value: unknown): value is UserStatus {
  return value === "active" || value === "suspended";
}

// URL → typed params. Anything unknown falls back to a default, so a
// hand-edited URL can never reach the database with an arbitrary value.
export function parseUserListParams(raw: RawParams): UserListParams {
  const role = first(raw.role);
  const status = first(raw.status);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 80),
    role: (isRole(role) ? role : "all") as UserRoleFilter,
    status: (STATUS_FILTERS as readonly string[]).includes(status) ? (status as UserStatusFilter) : "all",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as UserSort) : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Typed params → "" or "?a=b", omitting defaults.
export function buildUserListQuery(params: Partial<UserListParams>): string {
  const merged = { ...DEFAULT_USER_PARAMS, ...params };
  const search = new URLSearchParams();
  (Object.keys(DEFAULT_USER_PARAMS) as (keyof UserListParams)[]).forEach((key) => {
    if (merged[key] !== DEFAULT_USER_PARAMS[key]) search.set(key, String(merged[key]));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function hasActiveUserFilters(params: UserListParams): boolean {
  return params.q !== "" || params.role !== "all" || params.status !== "all";
}

// `%`, `_`, `\` are ILIKE wildcards; `,` `(` `)` would break a PostgREST `or=`
// filter. Escape the first set and drop the second so search text is literal.
export function sanitizeSearch(value: string): string {
  return value.replace(/[,()]/g, " ").replace(/[\\%_]/g, (c) => `\\${c}`).trim();
}

export type RoleChangeCheck = { ok: true; role: Role } | { ok: false; message: string };

// Business rules for a role change, given the target's current state.
export function checkRoleChange(input: { actorId: string; targetId: string; targetAcademyId: string | null; currentRole: Role; newRole: unknown }): RoleChangeCheck {
  if (!isRole(input.newRole)) return { ok: false, message: "Choose a valid role." };
  if (input.actorId === input.targetId) return { ok: false, message: "You can't change your own role." };
  if (input.newRole === input.currentRole) return { ok: false, message: "They already have that role." };
  if (roleRequiresAcademy(input.newRole) && !input.targetAcademyId) {
    return {
      ok: false,
      message: "Mentors and academy admins must belong to an academy. Use “Change academy” first.",
    };
  }
  return { ok: true, role: input.newRole };
}

export type AcademyChangeCheck = { ok: true; academyId: string | null } | { ok: false; message: string };

// Moving a user between academies (or out of one). Mentors and academy admins
// must always belong to an academy; super admins never do.
export function checkAcademyChange(input: { role: Role; currentAcademyId: string | null; newAcademyId: unknown }): AcademyChangeCheck {
  const next = input.newAcademyId === "" || input.newAcademyId === null ? null : input.newAcademyId;
  if (next !== null && !isUuid(next)) return { ok: false, message: "Choose a valid academy." };
  if (input.role === "super_admin") return { ok: false, message: "Super admins don't belong to an academy." };
  if (next === null && roleRequiresAcademy(input.role)) {
    return { ok: false, message: "Mentors and academy admins must belong to an academy. Change their role first." };
  }
  if (next === input.currentAcademyId) return { ok: false, message: "They're already in that academy." };
  return { ok: true, academyId: next };
}

export type StatusChangeCheck = { ok: true; status: UserStatus } | { ok: false; message: string };

export function checkStatusChange(input: { actorId: string; targetId: string; currentStatus: UserStatus; newStatus: unknown }): StatusChangeCheck {
  if (!isUserStatus(input.newStatus)) return { ok: false, message: "Choose a valid status." };
  if (input.actorId === input.targetId) return { ok: false, message: "You can't change your own account status." };
  if (input.newStatus === input.currentStatus) {
    return { ok: false, message: input.newStatus === "suspended" ? "This account is already suspended." : "This account is already active." };
  }
  return { ok: true, status: input.newStatus };
}
