// Academy people service (specs.md §8a.3c): an academy admin's students and
// mentors, and a mentor's own mentees. Every function derives the academy or
// the mentor from the session — never from the request — which is the
// academy-isolation boundary (AGENTS.md §10). RLS enforces the same scope.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academy-people/repository";
import { canRevoke, checkManualMentorInput, checkPersonInput, decideInvite, mentorAccess, STUDENT_PAGE_SIZE } from "@/lib/server/academy-people/validation";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type {
  AcademyMentorRecord,
  AcademyStudentDetail,
  AcademyStudentListParams,
  AcademyStudentListResult,
  AcademyStudentSummary,
} from "@/types/academy-people";

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized" | "not_set_up" | "server_error", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
type Field<F extends string> = { field?: F };

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
      if (invited.error) return inviteSendFailure(invited.error.code);
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

// Mentors with their access state: invite status comes from Supabase Auth
// (service role) for the ones who never signed in; details from 0027.
export async function getAcademyMentors(): Promise<ServiceResult<AcademyMentorRecord[]>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", "Only an academy admin can view mentors.");
  const found = await repo.findMentors(admin.academyId);
  if (found.error) return mapDbError(found.error, "We couldn't load your mentors. Please try again.");
  const ids = found.data.map((m) => m.id);
  const [auth, details] = await Promise.all([repo.findAuthStates(found.data.filter((m) => !m.lastLoginAt).map((m) => m.id)), repo.findMentorDetails(ids)]);
  const now = Date.now();
  return {
    ok: true,
    data: found.data.map((m) => {
      const state = m.lastLoginAt ? null : (auth?.get(m.id) ?? null);
      const access = mentorAccess(m, auth ? state : null, now);
      const extra = details?.get(m.id);
      return {
        ...m,
        access,
        invited: access === "not_invited" || access === "invited" || access === "expired",
        inviteSentAt: state?.sentAt ?? state?.invitedAt ?? null,
        qualifications: extra?.qualifications ?? null,
        specialization: extra?.specialization ?? [],
      };
    }),
  };
}

export const INVITE_UNAVAILABLE = "Invites need the server's SUPABASE_SERVICE_ROLE_KEY. Ask whoever runs this server to set it.";
export const MANUAL_UNAVAILABLE = "Adding mentors needs the server's SUPABASE_SERVICE_ROLE_KEY. Ask whoever runs this server to set it.";

// The email service's own refusal, in words an admin can act on. Never a
// false "sent": every one of these is a failure.
export const EMAIL_RATE_LIMIT_MESSAGE = "Too many emails were sent recently. Wait a few minutes and try again.";

function inviteSendFailure(code: string | undefined): ServiceResult<never> & Field<"email"> {
  if (code === "admin_unavailable") return fail<never>("not_set_up", INVITE_UNAVAILABLE);
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return { ...fail<never>("validation_error", EMAIL_RATE_LIMIT_MESSAGE), field: "email" };
  if (code === "email_address_not_authorized") {
    return { ...fail<never>("not_set_up", "The email service refused this address: Supabase's built-in email only sends to members of the Supabase organization. Set up custom SMTP (docs/email.md), or add the mentor manually for now."), field: "email" };
  }
  // Someone created this address between our duplicate check and the invite.
  if (code === "email_exists" || code === "user_already_exists") return { ...fail<never>("validation_error", "This email already has an EliteCadet account, so no invite was sent."), field: "email" };
  if (code === "email_address_invalid") return { ...fail<never>("validation_error", "The email service rejected this address. Check it and try again."), field: "email" };
  return { ...fail<never>("server_error", "The invite email couldn't be sent, so nothing was sent. If it keeps failing, check the email (SMTP) settings in Supabase (docs/email.md)."), field: "email" };
}

export async function inviteAcademyMentor(input: { email?: unknown; fullName?: unknown }, origin: string): Promise<ServiceResult<{ name: string; resent: boolean }> & { field?: "email" | "fullName" }> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", "Only an academy admin can invite mentors.");
  const checked = checkPersonInput(input, true);
  if (!checked.ok) return { ...fail("validation_error", checked.message), field: checked.field };

  // Invite, re-send a pending invite to this academy, or refuse — never a
  // "sent" for an account that would stay a student or in another academy.
  const existing = await repo.findAccountByEmail(checked.email);
  if (existing.error) return existing.error.code === "admin_unavailable" ? fail("not_set_up", INVITE_UNAVAILABLE) : fail("server_error", "We couldn't check that email right now. Please try again.");
  const decision = decideInvite(existing.data, { role: "mentor", academyId: admin.academyId });
  if (decision.kind === "refuse") {
    return {
      ...fail(
        "validation_error",
        decision.reason === "same_academy_active"
          ? "This person is already a mentor in your academy. They can log in, or use “Forgot password” on the login page."
          : "This email already has an EliteCadet account. Ask the platform team to change their role or academy.",
      ),
      field: "email",
    };
  }

  const invited = await repo.inviteByEmail({ email: checked.email, fullName: checked.fullName, role: "mentor", academyId: admin.academyId, redirectTo: `${origin}/reset-password` });
  if (invited.error) return inviteSendFailure(invited.error.code);
  // "Re-sent" only when an earlier invite exists; a manually added mentor's
  // first invite also goes down the resend path but is their first email.
  const resent = decision.kind === "resend" && Boolean(existing.data?.invitedAt);
  await repo.auditAsService({ actorId: admin.id, action: resent ? "mentor.invite_resent" : "mentor.invited", targetId: invited.data.id, details: { summary: resent ? "Mentor invite re-sent" : "Mentor invited by email" } });
  return { ok: true, data: { name: checked.fullName, resent } };
}

// Add a mentor's profile without sending anything (works without SMTP). The
// account has no password, so they can't log in until they accept an invite
// (sent later from the Mentors list) or a password-reset link and choose one.
export async function addMentorManually(input: {
  email?: unknown;
  fullName?: unknown;
  phone?: unknown;
  qualifications?: unknown;
  specialization?: unknown;
}): Promise<ServiceResult<{ id: string; name: string }> & Field<"email" | "fullName" | "phone" | "qualifications" | "specialization">> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", "Only an academy admin can add mentors.");
  const checked = checkManualMentorInput(input);
  if (!checked.ok) return { ...fail("validation_error", checked.message), field: checked.field };

  const existing = await repo.findAccountByEmail(checked.email);
  if (existing.error) return existing.error.code === "admin_unavailable" ? fail("not_set_up", MANUAL_UNAVAILABLE) : fail("server_error", "We couldn't check that email right now. Please try again.");
  if (existing.data) {
    const mine = existing.data.role === "mentor" && existing.data.academyId === admin.academyId;
    return {
      ...fail("validation_error", mine ? "This person is already one of your mentors. Find them in the list below." : "This email already has an EliteCadet account. Ask the platform team to change their role or academy."),
      field: "email",
    };
  }

  const created = await repo.createMentorAccount({ email: checked.email, fullName: checked.fullName, academyId: admin.academyId });
  if (created.error) {
    if (created.error.code === "admin_unavailable") return fail("not_set_up", MANUAL_UNAVAILABLE);
    // Lost a race with another add/invite of the same address.
    if (created.error.code === "email_exists" || created.error.code === "user_already_exists") return { ...fail("validation_error", "This email already has an EliteCadet account."), field: "email" };
    return fail("server_error", "We couldn't add the mentor. Please try again.");
  }
  const saved = await repo.saveMentorDetails(created.data.id, checked);
  if (saved.error) {
    // All or nothing: never leave a half-made mentor behind.
    await repo.deleteAccount(created.data.id);
    console.error(`[mentor] details save failed: code=${saved.error.code ?? "none"}${saved.error.code === "PGRST204" || saved.error.code === "42703" ? " hint=apply supabase/migrations/0027_mentor_onboarding.sql" : ""}`);
    return fail("server_error", "We couldn't save the mentor's details, so nothing was added. Please try again.");
  }
  await repo.auditAsService({ actorId: admin.id, action: "mentor.added_manually", targetId: created.data.id, details: { summary: "Mentor added manually (no login until they accept an invite)" } });
  return { ok: true, data: { id: created.data.id, name: checked.fullName } };
}

// A mentor of THIS academy who hasn't activated their account yet.
async function pendingMentor(mentorId: unknown): Promise<ServiceResult<{ admin: Actor & { academyId: string }; mentor: { id: string; email: string; fullName: string }; access: ReturnType<typeof mentorAccess> }>> {
  const admin = await academyAdmin();
  if (!admin) return fail("unauthorized", "Only an academy admin can manage mentor invites.");
  if (!isUuid(mentorId)) return fail("not_found", "We couldn't find that mentor.");
  const found = await repo.findAcademyMentor(admin.academyId, mentorId);
  if (found.error) return mapDbError(found.error, "We couldn't load that mentor. Please try again.");
  if (!found.data || !found.data.email) return fail("not_found", "We couldn't find that mentor.");
  const auth = await repo.findAuthStates([found.data.id]);
  if (!auth) return fail("not_set_up", INVITE_UNAVAILABLE);
  const state = auth.get(found.data.id);
  if (!state) return fail("not_found", "We couldn't find that mentor.");
  return { ok: true, data: { admin, mentor: { id: found.data.id, email: found.data.email, fullName: found.data.fullName }, access: mentorAccess(found.data, state, Date.now()) } };
}

// Send the first invite to a manually added mentor, or a fresh one (new link,
// new expiry) to an invited mentor whose link expired or got lost.
export async function resendMentorInvite(mentorId: unknown, origin: string): Promise<ServiceResult<{ name: string; resent: boolean }>> {
  const found = await pendingMentor(mentorId);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const { mentor, access } = found.data;
  if (!canRevoke(access)) return fail("validation_error", access === "suspended" ? "This mentor is suspended." : "This mentor has already activated their account. They can log in or use “Forgot password”.");
  const result = await inviteAcademyMentor({ email: mentor.email, fullName: mentor.fullName || mentor.email }, origin);
  return result.ok ? result : { ok: false, error: result.error };
}

// Revoke = delete the never-activated account: its invite link stops working
// at once and the person can't log in. Activated mentors can't be revoked.
export async function revokeMentorInvite(mentorId: unknown): Promise<ServiceResult<{ name: string }>> {
  const found = await pendingMentor(mentorId);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const { admin, mentor, access } = found.data;
  if (!canRevoke(access)) return fail("validation_error", "This mentor has already activated their account, so there's no invite to revoke. Ask the platform team to suspend them if needed.");
  const removed = await repo.deleteAccount(mentor.id);
  if (removed.error) {
    if (removed.error.code === "admin_unavailable") return fail("not_set_up", INVITE_UNAVAILABLE);
    return fail("server_error", "We couldn't revoke this invite. If they're on scheduled sessions, cancel those first, then try again.");
  }
  await repo.auditAsService({ actorId: admin.id, action: access === "not_invited" ? "mentor.removed_before_invite" : "mentor.invite_revoked", targetId: mentor.id, details: { summary: access === "not_invited" ? "Manually added mentor removed" : "Mentor invite revoked", email: mentor.email } });
  return { ok: true, data: { name: mentor.fullName || mentor.email } };
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
