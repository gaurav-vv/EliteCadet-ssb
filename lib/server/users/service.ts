// User Management service — business rules + authorization + audit for the
// users module (specs.md §8a.3). Pages and Server Actions call this; it calls
// the repository. No UI component touches Postgres directly (AGENTS.md §6/§9).

import { authorize, isGuardFailure } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/users/repository";
import { checkRoleChange, checkStatusChange, isUuid, USER_PAGE_SIZE } from "@/lib/server/users/validation";
import { ROLE_LABELS } from "@/types/auth";
import type { AuditEntry, PlatformUserSummary, UserListParams, UserListResult, UserRecord } from "@/types/users";

export type ServiceErrorCode = "unauthorized" | "validation_error" | "not_found" | "not_set_up" | "server_error";

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: ServiceErrorCode; message: string };
}

const fail = <T>(code: ServiceErrorCode, message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

export const USERS_NOT_SET_UP_MESSAGE =
  "User management isn't set up in your database yet. Run supabase/migrations/0004_super_admin_role.sql, then 0005_users_rbac.sql, in the Supabase SQL Editor, then reload.";

// Postgres/PostgREST error → plain language. Never leaks the raw message.
export function mapDbError<T>(error: repo.DbError, fallback = "Something went wrong. Please try again."): ServiceResult<T> {
  // 42703 = undefined column (0005 not applied yet), 42P01/PGRST205 = missing table.
  if (error.code === "42703" || error.code === "42P01" || error.code === "PGRST205" || error.code === "22P02") {
    return fail("not_set_up", USERS_NOT_SET_UP_MESSAGE);
  }
  if (error.code === "42501") return fail("unauthorized", "You don't have permission to do that.");
  return fail("server_error", fallback);
}

export async function getUserList(params: UserListParams): Promise<ServiceResult<UserListResult>> {
  const actor = await authorize("users.read");
  if (isGuardFailure(actor)) return actor;

  const first = await repo.findUsers(params, params.page);
  if (first.error) return mapDbError(first.error, "We couldn't load users. Please try again.");

  // A stale ?page=9 after filtering: fall back to the last real page.
  const pageCount = Math.max(1, Math.ceil(first.data.total / USER_PAGE_SIZE));
  let { rows } = first.data;
  let page = params.page;
  if (page > pageCount) {
    page = pageCount;
    const last = await repo.findUsers(params, page);
    if (last.error) return mapDbError(last.error, "We couldn't load users. Please try again.");
    rows = last.data.rows;
  }
  return { ok: true, data: { rows, total: first.data.total, page, pageCount, pageSize: USER_PAGE_SIZE } };
}

export async function getUserDetail(id: string): Promise<ServiceResult<{ user: UserRecord; history: AuditEntry[]; isSelf: boolean }>> {
  const actor = await authorize("users.read");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", "We couldn't find that user.");

  const found = await repo.findUserById(id);
  if (found.error) return mapDbError(found.error, "We couldn't load this user. Please try again.");
  if (!found.data) return fail("not_found", "We couldn't find that user.");

  const history = await repo.findAuditForTarget("user", id, 10);
  return { ok: true, data: { user: found.data, history: history.data ?? [], isSelf: actor.id === id } };
}

export async function getPlatformOverview(): Promise<ServiceResult<{ summary: PlatformUserSummary; recent: UserRecord[] }>> {
  const actor = await authorize("users.read");
  if (isGuardFailure(actor)) return actor;
  const [summary, recent] = await Promise.all([repo.countPlatform(), repo.findRecentUsers(5)]);
  if (summary.error) return mapDbError(summary.error, "We couldn't load platform totals. Please try again.");
  if (recent.error) return mapDbError(recent.error, "We couldn't load recent sign-ups. Please try again.");
  return { ok: true, data: { summary: summary.data, recent: recent.data } };
}

export async function changeUserRole(targetId: string, newRole: unknown): Promise<ServiceResult<null>> {
  const actor = await authorize("users.change_role");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(targetId)) return fail("not_found", "We couldn't find that user.");

  const found = await repo.findUserById(targetId);
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", "We couldn't find that user.");

  const check = checkRoleChange({
    actorId: actor.id,
    targetId,
    targetAcademyId: found.data.academyId,
    currentRole: found.data.role,
    newRole,
  });
  if (!check.ok) return fail("validation_error", check.message);

  const updated = await repo.updateUserRole(targetId, check.role);
  if (updated.error) return mapDbError(updated.error, "We couldn't change this role. Please try again.");
  if (updated.data === 0) return fail("not_found", "We couldn't find that user.");

  await repo.insertAudit({
    actorId: actor.id,
    action: "user.role_changed",
    targetType: "user",
    targetId,
    details: { from: found.data.role, to: check.role, summary: `Role changed from ${ROLE_LABELS[found.data.role]} to ${ROLE_LABELS[check.role]}` },
  });
  return { ok: true, data: null };
}

export async function changeUserStatus(targetId: string, newStatus: unknown): Promise<ServiceResult<null>> {
  const actor = await authorize("users.change_status");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(targetId)) return fail("not_found", "We couldn't find that user.");

  const found = await repo.findUserById(targetId);
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", "We couldn't find that user.");

  const check = checkStatusChange({ actorId: actor.id, targetId, currentStatus: found.data.status, newStatus });
  if (!check.ok) return fail("validation_error", check.message);

  const updated = await repo.updateUserStatus(targetId, check.status);
  if (updated.error) return mapDbError(updated.error, "We couldn't change this account's status. Please try again.");
  if (updated.data === 0) return fail("not_found", "We couldn't find that user.");

  await repo.insertAudit({
    actorId: actor.id,
    action: check.status === "suspended" ? "user.suspended" : "user.reactivated",
    targetType: "user",
    targetId,
    details: { summary: check.status === "suspended" ? "Account suspended" : "Account reactivated" },
  });
  return { ok: true, data: null };
}
