// User Management service — business rules + authorization + audit for the
// users module (specs.md §8a.3). Pages and Server Actions call this; it calls
// the repository. No UI component touches Postgres directly (AGENTS.md §6/§9).

import { authorize, isGuardFailure } from "@/lib/server/auth/guard";
import { findAccountByEmail, inviteByEmail } from "@/lib/server/academy-people/repository";
import { checkPersonInput, decideInvite } from "@/lib/server/academy-people/validation";
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

// Super admin only: invite a mentor who belongs to no academy (independent
// mentor, specs.md §8a.1). The invite carries role "mentor" and no academy, so
// the signup trigger (0007) creates them with academy_id null. Academy admins
// can't reach this: their invites always carry their own academy.
export async function inviteIndependentMentor(input: { email?: unknown; fullName?: unknown }, origin: string): Promise<ServiceResult<{ name: string; resent: boolean }> & { field?: "email" | "fullName" }> {
  const actor = await authorize("users.invite_mentor");
  if (isGuardFailure(actor)) return actor;
  const checked = checkPersonInput(input, true);
  if (!checked.ok) return { ...fail("validation_error", checked.message), field: checked.field };
  const existing = await findAccountByEmail(checked.email);
  if (existing.error) return existing.error.code === "admin_unavailable" ? fail("not_set_up", "Invites need the server's SUPABASE_SERVICE_ROLE_KEY. Ask whoever runs this server to set it.") : fail("server_error", "We couldn't check that email right now. Please try again.");
  const decision = decideInvite(existing.data, { role: "mentor", academyId: null });
  if (decision.kind === "refuse") {
    const who = existing.data!;
    const label = who.role === "academy_admin" ? "an academy admin" : who.role === "super_admin" ? "a super admin" : `a ${who.role}`;
    return {
      ...fail(
        "validation_error",
        decision.reason === "same_academy_active"
          ? "This person is already an independent mentor. They can log in, or use “Forgot password”."
          : `This email already belongs to ${label}${who.academyId ? " in an academy" : ""}${who.pending ? " (invite not yet accepted)" : ""}. Change their role or academy from their user page instead.`,
      ),
      field: "email",
    };
  }
  const invited = await inviteByEmail({ email: checked.email, fullName: checked.fullName, role: "mentor", academyId: null, redirectTo: `${origin}/reset-password` });
  if (invited.error) {
    if (invited.error.code === "admin_unavailable") return fail("not_set_up", "Invites need the server's SUPABASE_SERVICE_ROLE_KEY. Ask whoever runs this server to set it.");
    const taken = invited.error.code === "email_exists" || /already/i.test(invited.error.message ?? "");
    return { ...fail("validation_error", taken ? "An account with this email already exists. Change their role from their user page instead." : "We couldn't send the invite. Please try again."), field: "email" };
  }
  await repo.insertAudit({
    actorId: actor.id,
    action: "user.invited",
    targetType: "user",
    targetId: invited.data.id,
    details: { role: "mentor", academy: null, summary: `${decision.kind === "resend" ? "Re-sent the invite to" : "Invited"} ${checked.fullName} as an independent mentor` },
  });
  return { ok: true, data: { name: checked.fullName, resent: decision.kind === "resend" } };
}
