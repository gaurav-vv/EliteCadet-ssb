// Academy people service (specs.md §8a.3c): an academy admin's students and
// mentors, and a mentor's own mentees. Every function derives the academy or
// the mentor from the session — never from the request — which is the
// academy-isolation boundary (AGENTS.md §10). RLS enforces the same scope.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academy-people/repository";
import { checkPersonInput, STUDENT_PAGE_SIZE } from "@/lib/server/academy-people/validation";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type {
  AcademyMentorRecord,
  AcademyStudentDetail,
  AcademyStudentListParams,
  AcademyStudentListResult,
  AcademyStudentSummary,
} from "@/types/academy-people";

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

async function academyAdmin(): Promise<(Actor & { academyId: string }) | null> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "academy_admin" || !actor.profile.academyId) return null;
  return { ...actor, academyId: actor.profile.academyId };
}

async function mentor(): Promise<(Actor & { academyId: string }) | null> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "mentor" || !actor.profile.academyId) return null;
  return { ...actor, academyId: actor.profile.academyId };
}

const ADMIN_ONLY = "Only an academy admin can manage students.";

async function paged(academyId: string, params: AcademyStudentListParams, batchIds?: string[]): Promise<ServiceResult<AcademyStudentListResult>> {
  let page = params.page;
  let found = await repo.findStudents(academyId, params, page, batchIds);
  if (found.error) return mapDbError(found.error, "We couldn't load students. Please try again.");
  const pageCount = Math.max(1, Math.ceil(found.data.total / STUDENT_PAGE_SIZE));
  if (page > pageCount) {
    page = pageCount;
    found = await repo.findStudents(academyId, params, page, batchIds);
    if (found.error) return mapDbError(found.error, "We couldn't load students. Please try again.");
  }
  return { ok: true, data: { rows: found.data.rows, total: found.data.total, page, pageCount, pageSize: STUDENT_PAGE_SIZE } };
}

// ---- Academy admin ---------------------------------------------------------

export async function getAcademyStudents(params: AcademyStudentListParams): Promise<ServiceResult<{ list: AcademyStudentListResult; summary: AcademyStudentSummary }>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", ADMIN_ONLY);
  const [list, summary] = await Promise.all([paged(admin.academyId, params), repo.countStudents(admin.academyId)]);
  if (!list.ok || !list.data) return list as ServiceResult<never>;
  if (summary.error) return mapDbError(summary.error, "We couldn't load student totals. Please try again.");
  return { ok: true, data: { list: list.data, summary: summary.data } };
}

export async function getAcademyStudent(id: string): Promise<ServiceResult<AcademyStudentDetail>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", ADMIN_ONLY);
  if (!isUuid(id)) return fail("not_found", "We couldn't find that student.");
  const found = await repo.findStudent(admin.academyId, id);
  if (found.error) return mapDbError(found.error, "We couldn't load this student. Please try again.");
  if (!found.data) return fail("not_found", "We couldn't find that student.");
  const mentors = found.data.batchId ? await repo.findBatchMentors(found.data.batchId) : { data: [], error: null };
  return { ok: true, data: { student: found.data, mentors: mentors.data ?? [] } };
}

// Add by email: an existing student account with no academy joins; otherwise
// (no account yet) an invite is emailed. Never takes another academy's student.
export async function addAcademyStudent(input: { email?: unknown; fullName?: unknown }, origin: string): Promise<ServiceResult<{ id: string; name: string; invited: boolean }> & { field?: "email" | "fullName" }> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", ADMIN_ONLY);
  const basic = checkPersonInput(input, false);
  if (!basic.ok) return { ...fail("validation_error", basic.message), field: basic.field };

  const existing = await repo.addExistingStudent(basic.email);
  if (!existing.error) return { ok: true, data: { id: existing.data.id, name: existing.data.fullName || basic.email, invited: false } };

  switch (existing.error.code) {
    case "P0002": {
      const named = checkPersonInput(input, true);
      if (!named.ok) return { ...fail("validation_error", "No account uses that email yet. Add their name and we'll email them an invite."), field: "fullName" };
      const invited = await repo.inviteByEmail({ email: named.email, fullName: named.fullName, role: "student", academyId: admin.academyId, redirectTo: `${origin}/reset-password` });
      if (invited.error) return fail("validation_error", "We couldn't send the invite. Check the email address and try again.");
      return { ok: true, data: { id: invited.data.id, name: named.fullName, invited: true } };
    }
    case "23505":
      return { ...fail("validation_error", "That student already belongs to another academy."), field: "email" };
    case "23514":
      return { ...fail("validation_error", "That account isn't a student account."), field: "email" };
    default:
      return mapDbError(existing.error, "We couldn't add the student. Please try again.");
  }
}

export async function removeAcademyStudent(id: string): Promise<ServiceResult<null>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", ADMIN_ONLY);
  if (!isUuid(id)) return fail("not_found", "We couldn't find that student.");
  const removed = await repo.removeStudent(id);
  if (removed.error) {
    if (removed.error.code === "P0002") return fail("not_found", "That student isn't in your academy.");
    return mapDbError(removed.error, "We couldn't remove the student. Please try again.");
  }
  return { ok: true, data: null };
}

export async function getAcademyMentors(): Promise<ServiceResult<AcademyMentorRecord[]>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", "Only an academy admin can view mentors.");
  const found = await repo.findMentors(admin.academyId);
  if (found.error) return mapDbError(found.error, "We couldn't load your mentors. Please try again.");
  return { ok: true, data: found.data };
}

export async function inviteAcademyMentor(input: { email?: unknown; fullName?: unknown }, origin: string): Promise<ServiceResult<{ name: string }> & { field?: "email" | "fullName" }> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", "Only an academy admin can invite mentors.");
  const checked = checkPersonInput(input, true);
  if (!checked.ok) return { ...fail("validation_error", checked.message), field: checked.field };
  const invited = await repo.inviteByEmail({ email: checked.email, fullName: checked.fullName, role: "mentor", academyId: admin.academyId, redirectTo: `${origin}/reset-password` });
  if (invited.error) {
    const taken = invited.error.code === "email_exists" || /already/i.test(invited.error.message ?? "");
    return { ...fail("validation_error", taken ? "An account with this email already exists. Ask the platform team to add them to your academy." : "We couldn't send the invite. Please try again."), field: "email" };
  }
  return { ok: true, data: { name: checked.fullName } };
}

// ---- Mentor: own assigned students only -----------------------------------

export async function getMyMentees(params: AcademyStudentListParams): Promise<ServiceResult<{ list: AcademyStudentListResult; batches: { id: string; name: string }[] }>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can view mentees.");
  const batches = await repo.findMyBatchIds(me.id);
  if (batches.error) return mapDbError(batches.error, "We couldn't load your batches. Please try again.");
  const ids = batches.data.map((b) => b.id);
  // A batch filter for a batch that isn't theirs simply returns nothing.
  const list = await paged(me.academyId, params, ids);
  if (!list.ok || !list.data) return list as ServiceResult<never>;
  return { ok: true, data: { list: list.data, batches: batches.data } };
}

export async function getMyMentee(id: string): Promise<ServiceResult<AcademyStudentDetail>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can view mentees.");
  if (!isUuid(id)) return fail("not_found", "This student isn't one of your mentees.");
  const batches = await repo.findMyBatchIds(me.id);
  if (batches.error) return mapDbError(batches.error);
  const found = await repo.findStudent(me.academyId, id);
  if (found.error) return mapDbError(found.error, "We couldn't load this student. Please try again.");
  // Same answer whether the student doesn't exist or isn't assigned to them.
  if (!found.data || !found.data.batchId || !batches.data.some((b) => b.id === found.data!.batchId)) {
    return fail("not_found", "This student isn't one of your mentees.");
  }
  const mentors = await repo.findBatchMentors(found.data.batchId);
  return { ok: true, data: { student: found.data, mentors: mentors.data ?? [] } };
}
