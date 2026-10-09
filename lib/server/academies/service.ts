// Academies service — business rules + authorization + audit (specs.md §8a.3b).
// Pages and Server Actions call this; it calls the repositories.

import { authorize, getActor, isGuardFailure } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academies/repository";
import { ACADEMY_PAGE_SIZE, isAcademyStatus, isMemberRole, validateAcademyInput, type AcademyFieldErrors } from "@/lib/server/academies/validation";
import { can } from "@/lib/server/permissions/rbac";
import { findAuditForTarget, insertAudit } from "@/lib/server/users/repository";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { checkAcademyChange, isUuid } from "@/lib/server/users/validation";
import { ROLE_LABELS } from "@/types/auth";
import type { AuditEntry } from "@/types/users";
import type {
  AcademyInput,
  AcademyListParams,
  AcademyListResult,
  AcademyMember,
  AcademyMemberCounts,
  AcademyOption,
  AcademyRecord,
} from "@/types/academies";

export type AcademyServiceResult<T> = ServiceResult<T> & { fieldErrors?: AcademyFieldErrors };

const fail = <T>(code: "validation_error" | "not_found", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that academy.";

export async function getAcademyList(params: AcademyListParams): Promise<ServiceResult<AcademyListResult>> {
  const actor = await authorize("academies.read_all");
  if (isGuardFailure(actor)) return actor;

  let page = params.page;
  let found = await repo.findAcademies(params, page);
  if (found.error) return mapDbError(found.error, "We couldn't load academies. Please try again.");
  const pageCount = Math.max(1, Math.ceil(found.data.total / ACADEMY_PAGE_SIZE));
  if (page > pageCount) {
    page = pageCount;
    found = await repo.findAcademies(params, page);
    if (found.error) return mapDbError(found.error, "We couldn't load academies. Please try again.");
  }

  const counts = await repo.countMembers(found.data.rows.map((a) => a.id));
  if (counts.error) return mapDbError(counts.error, "We couldn't load academy members. Please try again.");
  const rows = found.data.rows.map((a) => ({ ...a, counts: repo.countsFor(counts.data, a.id) }));
  return { ok: true, data: { rows, total: found.data.total, page, pageCount, pageSize: ACADEMY_PAGE_SIZE } };
}

export async function getAcademyDetail(
  id: string,
): Promise<ServiceResult<{ academy: AcademyRecord; counts: AcademyMemberCounts; members: AcademyMember[]; history: AuditEntry[] }>> {
  const actor = await authorize("academies.read_all");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);

  const found = await repo.findAcademyById(id);
  if (found.error) return mapDbError(found.error, "We couldn't load this academy. Please try again.");
  if (!found.data) return fail("not_found", NOT_FOUND);

  const [members, counts, history] = await Promise.all([repo.findMembers(id), repo.countMembers([id]), findAuditForTarget("academy", id, 10)]);
  if (members.error) return mapDbError(members.error, "We couldn't load this academy's members. Please try again.");
  return {
    ok: true,
    data: {
      academy: found.data,
      members: members.data,
      counts: counts.data ? repo.countsFor(counts.data, id) : { admins: 0, mentors: 0, students: 0 },
      history: history.data ?? [],
    },
  };
}

export async function getAcademyOptions(): Promise<ServiceResult<AcademyOption[]>> {
  const actor = await authorize("academies.read_all");
  if (isGuardFailure(actor)) return actor;
  const found = await repo.findAcademyOptions();
  if (found.error) return mapDbError(found.error, "We couldn't load academies. Please try again.");
  return { ok: true, data: found.data };
}

export async function createAcademy(input: Partial<Record<keyof AcademyInput, unknown>>): Promise<AcademyServiceResult<{ id: string }>> {
  const actor = await authorize("academies.manage");
  if (isGuardFailure(actor)) return actor;
  const parsed = validateAcademyInput(input);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };

  const created = await repo.insertAcademy(parsed.value);
  if (created.error) return mapDbError(created.error, "We couldn't create the academy. Please try again.");
  await insertAudit({ actorId: actor.id, action: "academy.created", targetType: "academy", targetId: created.data.id, details: { summary: `Academy "${parsed.value.name}" created` } });
  return { ok: true, data: created.data };
}

export async function updateAcademyProfile(id: string, input: Partial<Record<keyof AcademyInput, unknown>>): Promise<AcademyServiceResult<null>> {
  const actor = await authorize("academies.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const parsed = validateAcademyInput(input);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };

  const updated = await repo.updateAcademy(id, parsed.value);
  if (updated.error) return mapDbError(updated.error, "We couldn't save the academy. Please try again.");
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  await insertAudit({ actorId: actor.id, action: "academy.updated", targetType: "academy", targetId: id, details: { summary: "Academy details updated" } });
  return { ok: true, data: null };
}

export async function changeAcademyStatus(id: string, status: unknown): Promise<ServiceResult<null>> {
  const actor = await authorize("academies.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  if (!isAcademyStatus(status)) return fail("validation_error", "Choose a valid status.");

  const found = await repo.findAcademyById(id);
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", NOT_FOUND);
  if (found.data.status === status) return fail("validation_error", status === "suspended" ? "This academy is already suspended." : "This academy is already active.");

  const updated = await repo.updateAcademy(id, { status });
  if (updated.error) return mapDbError(updated.error, "We couldn't change the academy's status. Please try again.");
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  await insertAudit({
    actorId: actor.id,
    action: status === "suspended" ? "academy.suspended" : "academy.reactivated",
    targetType: "academy",
    targetId: id,
    details: { summary: status === "suspended" ? "Academy suspended" : "Academy reactivated" },
  });
  return { ok: true, data: null };
}

export async function addAcademyMember(academyId: string, email: unknown, role: unknown): Promise<ServiceResult<{ name: string }>> {
  const actor = await authorize("academies.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(academyId)) return fail("not_found", NOT_FOUND);
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail("validation_error", "Enter a valid email address.");
  if (!isMemberRole(role)) return fail("validation_error", "Choose Student, Mentor or Academy Admin.");

  const academy = await repo.findAcademyById(academyId);
  if (academy.error) return mapDbError(academy.error);
  if (!academy.data) return fail("not_found", NOT_FOUND);

  const person = await repo.findProfileByEmail(email);
  if (person.error) return mapDbError(person.error);
  if (!person.data) return fail("not_found", "No account uses that email. They need to sign up first.");
  if (person.data.role === "super_admin") return fail("validation_error", "Super admins can't be added to an academy.");
  if (person.data.id === actor.id) return fail("validation_error", "You can't change your own membership.");
  if (person.data.academyId === academyId && person.data.role === role) return fail("validation_error", "They're already in this academy with that role.");

  const updated = await repo.setMembership(person.data.id, { academy_id: academyId, role });
  if (updated.error) return mapDbError(updated.error, "We couldn't add them. Please try again.");
  if (updated.data === 0) return fail("not_found", "We couldn't find that account.");

  const name = person.data.fullName || email.trim();
  const summary = `${name} added as ${ROLE_LABELS[role]}`;
  await Promise.all([
    insertAudit({ actorId: actor.id, action: "academy.member_added", targetType: "academy", targetId: academyId, details: { userId: person.data.id, role, summary } }),
    insertAudit({ actorId: actor.id, action: "user.academy_changed", targetType: "user", targetId: person.data.id, details: { from: person.data.academyId, to: academyId, summary: `Added to ${academy.data.name} as ${ROLE_LABELS[role]}` } }),
  ]);
  return { ok: true, data: { name } };
}

// Only students can simply be removed; mentors/admins need a role change first.
export async function removeAcademyMember(academyId: string, userId: string): Promise<ServiceResult<null>> {
  const actor = await authorize("academies.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(academyId) || !isUuid(userId)) return fail("not_found", "We couldn't find that member.");

  const members = await repo.findMembers(academyId);
  if (members.error) return mapDbError(members.error);
  const member = members.data.find((m) => m.id === userId);
  if (!member) return fail("not_found", "They're not a member of this academy.");
  const check = checkAcademyChange({ role: member.role, currentAcademyId: academyId, newAcademyId: null });
  if (!check.ok) return fail("validation_error", check.message);

  const updated = await repo.setMembership(userId, { academy_id: null });
  if (updated.error) return mapDbError(updated.error, "We couldn't remove them. Please try again.");
  const summary = `${member.fullName || member.email || "A member"} removed`;
  await Promise.all([
    insertAudit({ actorId: actor.id, action: "academy.member_removed", targetType: "academy", targetId: academyId, details: { userId, summary } }),
    insertAudit({ actorId: actor.id, action: "user.academy_changed", targetType: "user", targetId: userId, details: { from: academyId, to: null, summary: "Removed from their academy" } }),
  ]);
  return { ok: true, data: null };
}

// From User Management: move a user to another academy, or out of one.
export async function changeUserAcademy(userId: string, academyId: unknown, current: { role: AcademyMember["role"]; academyId: string | null }): Promise<ServiceResult<null>> {
  const actor = await authorize("academies.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(userId)) return fail("not_found", "We couldn't find that user.");
  if (userId === actor.id) return fail("validation_error", "You can't change your own academy.");

  const check = checkAcademyChange({ role: current.role, currentAcademyId: current.academyId, newAcademyId: academyId });
  if (!check.ok) return fail("validation_error", check.message);
  let academyName = "no academy";
  if (check.academyId) {
    const academy = await repo.findAcademyById(check.academyId);
    if (academy.error) return mapDbError(academy.error);
    if (!academy.data) return fail("validation_error", "Choose a valid academy.");
    academyName = academy.data.name;
  }

  const updated = await repo.setMembership(userId, { academy_id: check.academyId });
  if (updated.error) return mapDbError(updated.error, "We couldn't change their academy. Please try again.");
  if (updated.data === 0) return fail("not_found", "We couldn't find that user.");
  await insertAudit({ actorId: actor.id, action: "user.academy_changed", targetType: "user", targetId: userId, details: { from: current.academyId, to: check.academyId, summary: `Academy changed to ${academyName}` } });
  return { ok: true, data: null };
}

// ---- Academy Admin: their own academy only --------------------------------

export async function getMyAcademy(): Promise<ServiceResult<AcademyRecord>> {
  const actor = await getActor();
  if (!actor || !can(actor.profile.role, "academy.update_own") || !actor.profile.academyId) {
    return { ok: false, error: { code: "unauthorized", message: "Only an academy admin can view academy settings." } };
  }
  const found = await repo.findAcademyById(actor.profile.academyId);
  if (found.error) return mapDbError(found.error, "We couldn't load your academy. Please try again.");
  if (!found.data) return fail("not_found", NOT_FOUND);
  return { ok: true, data: found.data };
}

export async function updateMyAcademy(input: Partial<Record<keyof AcademyInput, unknown>>): Promise<AcademyServiceResult<null>> {
  const actor = await getActor();
  if (!actor || !can(actor.profile.role, "academy.update_own") || !actor.profile.academyId) {
    return { ok: false, error: { code: "unauthorized", message: "Only an academy admin can edit academy settings." } };
  }
  const parsed = validateAcademyInput(input);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };

  // The academy id comes from the session, never from the request.
  const updated = await repo.updateAcademy(actor.profile.academyId, parsed.value);
  if (updated.error) return mapDbError(updated.error, "We couldn't save your academy. Please try again.");
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  return { ok: true, data: null };
}
