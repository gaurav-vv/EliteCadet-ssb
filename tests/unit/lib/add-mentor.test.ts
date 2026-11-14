// @vitest-environment node
// Add Mentor (academy admin): manual profile without email or login, invite
// by email with genuine provider errors, resend/revoke of never-activated
// mentors only, and the access status shown in the list. The actor and the
// repository are mocked; the academy always comes from the session.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({
  findAccountByEmail: vi.fn(),
  inviteByEmail: vi.fn(),
  createMentorAccount: vi.fn(),
  saveMentorDetails: vi.fn(),
  deleteAccount: vi.fn(),
  findAuthStates: vi.fn(),
  findMentorDetails: vi.fn(),
  findAcademyMentor: vi.fn(),
  findMentors: vi.fn(),
  auditAsService: vi.fn(async () => undefined),
}));

import { getActor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academy-people/repository";
import * as service from "@/lib/server/academy-people/service";
import { checkManualMentorInput, INVITE_LINK_TTL_SECONDS, mentorAccess } from "@/lib/server/academy-people/validation";

const AC = "11111111-1111-4111-8111-111111111111";
const OTHER_AC = "99999999-9999-4999-8999-999999999999";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const MENTOR = "33333333-3333-4333-8333-333333333333";
const ORIGIN = "http://localhost:3000";

const actor = (role: "academy_admin" | "mentor" | "student" | "super_admin", academyId: string | null = AC) => ({ id: ADMIN, email: null, profile: { id: ADMIN, role, fullName: "Admin", academyId, status: "active" as const } });
const manual = { fullName: "Major Rao", email: "Rao@Example.test", phone: "+91 98765 43210", qualifications: "Ex-GTO, 12 years", specialization: "GTO, Interview" };
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const notInvited = { invitedAt: null, sentAt: null, confirmedAt: null, lastSignInAt: null };
const invitedState = (sentMinutesAgo: number) => ({ invitedAt: minutesAgo(sentMinutesAgo), sentAt: minutesAgo(sentMinutesAgo), confirmedAt: null, lastSignInAt: null });
const mentorRow = { id: MENTOR, email: "rao@example.test", fullName: "Major Rao", status: "active" as const, lastLoginAt: null };

beforeEach(() => {
  vi.mocked(getActor).mockReset().mockResolvedValue(actor("academy_admin"));
  for (const fn of Object.values(repo)) vi.mocked(fn as () => unknown).mockReset();
  vi.mocked(repo.auditAsService).mockResolvedValue(undefined);
  vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: null, error: null });
  vi.mocked(repo.createMentorAccount).mockResolvedValue({ data: { id: MENTOR }, error: null });
  vi.mocked(repo.saveMentorDetails).mockResolvedValue({ data: null, error: null });
  vi.mocked(repo.deleteAccount).mockResolvedValue({ data: null, error: null });
  vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: { id: MENTOR }, error: null });
  vi.mocked(repo.findAcademyMentor).mockResolvedValue({ data: mentorRow, error: null });
});

describe("authorization (server-side, before any account is touched)", () => {
  it.each([
    ["a mentor", actor("mentor")],
    ["a student", actor("student")],
    ["a super admin (not an academy admin)", actor("super_admin", null)],
    ["an academy admin without an academy", actor("academy_admin", null)],
    ["nobody", null],
  ])("refuses %s on every Add Mentor action", async (_n, a) => {
    vi.mocked(getActor).mockResolvedValue(a);
    expect((await service.addMentorManually(manual)).error?.code).toBe("unauthorized");
    expect((await service.inviteAcademyMentor(manual, ORIGIN)).error?.code).toBe("unauthorized");
    expect((await service.resendMentorInvite(MENTOR, ORIGIN)).error?.code).toBe("unauthorized");
    expect((await service.revokeMentorInvite(MENTOR)).error?.code).toBe("unauthorized");
    expect(repo.createMentorAccount).not.toHaveBeenCalled();
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
    expect(repo.deleteAccount).not.toHaveBeenCalled();
  });

  it("can't reach another academy's mentor: the lookup is scoped to the admin's academy", async () => {
    vi.mocked(repo.findAcademyMentor).mockResolvedValue({ data: null, error: null }); // not in AC
    expect((await service.revokeMentorInvite(MENTOR)).error?.code).toBe("not_found");
    expect(repo.findAcademyMentor).toHaveBeenCalledWith(AC, MENTOR);
    expect(repo.deleteAccount).not.toHaveBeenCalled();
  });
});

describe("Add mentor manually", () => {
  it("creates a password-less mentor account in the admin's academy, saves details, sends no email, and audits", async () => {
    const res = await service.addMentorManually(manual);
    expect(res).toEqual({ ok: true, data: { id: MENTOR, name: "Major Rao" } });
    expect(repo.createMentorAccount).toHaveBeenCalledWith({ email: "rao@example.test", fullName: "Major Rao", academyId: AC });
    expect(repo.saveMentorDetails).toHaveBeenCalledWith(MENTOR, expect.objectContaining({ phone: "+91 98765 43210", qualifications: "Ex-GTO, 12 years", specialization: ["GTO", "Interview"] }));
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
    expect(repo.auditAsService).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN, action: "mentor.added_manually", targetId: MENTOR }));
  });

  it("refuses a duplicate: an email that's already one of this academy's mentors", async () => {
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: { id: MENTOR, role: "mentor", academyId: AC, pending: true, invitedAt: null }, error: null });
    const res = await service.addMentorManually(manual);
    expect(res.error?.message).toMatch(/already one of your mentors/);
    expect(res.field).toBe("email");
    expect(repo.createMentorAccount).not.toHaveBeenCalled();
  });

  it("refuses an email that belongs to any other account, without saying whose", async () => {
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: { id: MENTOR, role: "student", academyId: OTHER_AC, pending: false, invitedAt: null }, error: null });
    const res = await service.addMentorManually(manual);
    expect(res.error?.message).toMatch(/already has an EliteCadet account/);
    expect(res.error?.message).not.toMatch(/student/i);
    expect(res.error?.message).not.toContain(OTHER_AC);
    expect(repo.createMentorAccount).not.toHaveBeenCalled();
  });

  it("is all-or-nothing: if the details can't be saved, the new account is deleted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(repo.saveMentorDetails).mockResolvedValue({ data: null, error: { code: "42703" } });
    const res = await service.addMentorManually(manual);
    expect(res.ok).toBe(false);
    expect(repo.deleteAccount).toHaveBeenCalledWith(MENTOR);
  });

  it("validates input before any lookup", async () => {
    expect((await service.addMentorManually({ ...manual, phone: "call me" })).field).toBe("phone");
    expect((await service.addMentorManually({ ...manual, email: "nope" })).field).toBe("email");
    expect(repo.findAccountByEmail).not.toHaveBeenCalled();
  });

  it("explains a missing service key instead of failing silently", async () => {
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: null, error: { code: "admin_unavailable" } });
    expect((await service.addMentorManually(manual)).error?.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe("Invite by email", () => {
  it("sends the invite with the mentor role and the admin's academy, to the set-password page", async () => {
    const res = await service.inviteAcademyMentor(manual, ORIGIN);
    expect(res).toEqual({ ok: true, data: { name: "Major Rao", resent: false } });
    expect(repo.inviteByEmail).toHaveBeenCalledWith({ email: "rao@example.test", fullName: "Major Rao", role: "mentor", academyId: AC, redirectTo: `${ORIGIN}/reset-password` });
    expect(repo.auditAsService).toHaveBeenCalledWith(expect.objectContaining({ action: "mentor.invited" }));
  });

  it("reports the email provider's refusal as a failure, never as sent", async () => {
    vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: null, error: { code: "email_address_not_authorized" } });
    const refused = await service.inviteAcademyMentor(manual, ORIGIN);
    expect(refused.ok).toBe(false);
    expect(refused.error?.message).toMatch(/custom SMTP/);
    vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: null, error: { code: "unexpected_failure" } });
    const smtpDown = await service.inviteAcademyMentor(manual, ORIGIN);
    expect(smtpDown.ok).toBe(false);
    expect(smtpDown.error?.message).toMatch(/nothing was sent/);
    expect(repo.auditAsService).not.toHaveBeenCalled();
  });

  it("reports a concurrent duplicate (email_exists from Auth) as an existing account, not a send failure", async () => {
    vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: null, error: { code: "email_exists" } });
    const res = await service.inviteAcademyMentor(manual, ORIGIN);
    expect(res.ok).toBe(false);
    expect(res.error?.message).toMatch(/already has an EliteCadet account, so no invite was sent/);
  });

  it("a manually added mentor's first invite is 'sent', not 're-sent'", async () => {
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: { id: MENTOR, role: "mentor", academyId: AC, pending: true, invitedAt: null }, error: null });
    expect((await service.inviteAcademyMentor(manual, ORIGIN)).data).toEqual({ name: "Major Rao", resent: false });
  });

  it("refuses to invite someone who already activated", async () => {
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: { id: MENTOR, role: "mentor", academyId: AC, pending: false, invitedAt: minutesAgo(600) }, error: null });
    expect((await service.inviteAcademyMentor(manual, ORIGIN)).error?.message).toMatch(/already a mentor/);
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
  });
});

describe("resend and revoke", () => {
  it("sends the first invite to a manually added mentor", async () => {
    vi.mocked(repo.findAuthStates).mockResolvedValue(new Map([[MENTOR, notInvited]]));
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: { id: MENTOR, role: "mentor", academyId: AC, pending: true, invitedAt: null }, error: null });
    const res = await service.resendMentorInvite(MENTOR, ORIGIN);
    expect(res.ok).toBe(true);
    expect(repo.inviteByEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "rao@example.test", role: "mentor", academyId: AC }));
  });

  it("re-sends an expired invite (a fresh link)", async () => {
    vi.mocked(repo.findAuthStates).mockResolvedValue(new Map([[MENTOR, invitedState(120)]]));
    vi.mocked(repo.findAccountByEmail).mockResolvedValue({ data: { id: MENTOR, role: "mentor", academyId: AC, pending: true, invitedAt: minutesAgo(120) }, error: null });
    expect((await service.resendMentorInvite(MENTOR, ORIGIN)).data).toEqual({ name: "Major Rao", resent: true });
  });

  it("revokes a pending invite by deleting the never-activated account, and audits it", async () => {
    vi.mocked(repo.findAuthStates).mockResolvedValue(new Map([[MENTOR, invitedState(5)]]));
    expect((await service.revokeMentorInvite(MENTOR)).ok).toBe(true);
    expect(repo.deleteAccount).toHaveBeenCalledWith(MENTOR);
    expect(repo.auditAsService).toHaveBeenCalledWith(expect.objectContaining({ action: "mentor.invite_revoked", targetId: MENTOR }));
  });

  it("never revokes or re-invites a mentor who has activated (accepted the invite)", async () => {
    vi.mocked(repo.findAuthStates).mockResolvedValue(new Map([[MENTOR, { ...invitedState(30), confirmedAt: minutesAgo(20), lastSignInAt: minutesAgo(20) }]]));
    expect((await service.revokeMentorInvite(MENTOR)).error?.code).toBe("validation_error");
    expect((await service.resendMentorInvite(MENTOR, ORIGIN)).error?.message).toMatch(/already activated/);
    expect(repo.deleteAccount).not.toHaveBeenCalled();
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
  });

  it("rejects ids that aren't UUIDs", async () => {
    expect((await service.revokeMentorInvite("../etc")).error?.code).toBe("not_found");
    expect(repo.findAcademyMentor).not.toHaveBeenCalled();
  });
});

describe("mentorAccess — the status in the list", () => {
  const now = Date.now();
  const base = { status: "active" as const, lastLoginAt: null };
  it("tracks not invited → invited → expired → accepted (active)", () => {
    expect(mentorAccess(base, notInvited, now)).toBe("not_invited");
    expect(mentorAccess(base, invitedState(10), now)).toBe("invited");
    expect(mentorAccess(base, invitedState(INVITE_LINK_TTL_SECONDS / 60 + 1), now)).toBe("expired");
    expect(mentorAccess(base, { ...invitedState(10), confirmedAt: minutesAgo(1) }, now)).toBe("active");
    expect(mentorAccess({ ...base, lastLoginAt: minutesAgo(1) }, null, now)).toBe("active");
  });
  it("suspended wins; unknown auth state falls back to 'invited'", () => {
    expect(mentorAccess({ status: "suspended", lastLoginAt: null }, notInvited, now)).toBe("suspended");
    expect(mentorAccess(base, null, now)).toBe("invited");
  });
});

describe("checkManualMentorInput", () => {
  it("normalizes and de-duplicates specializations; phone and details optional", () => {
    expect(checkManualMentorInput({ fullName: " Major  Rao ", email: "R@X.CO", specialization: "GTO, gto , GTO,Interview" })).toEqual({
      ok: true,
      email: "r@x.co",
      fullName: "Major Rao",
      phone: null,
      qualifications: null,
      specialization: ["GTO", "gto", "Interview"],
    });
  });
  it("rejects oversize qualifications and too many specializations", () => {
    expect(checkManualMentorInput({ ...manual, qualifications: "x".repeat(501) })).toMatchObject({ ok: false, field: "qualifications" });
    expect(checkManualMentorInput({ ...manual, specialization: Array.from({ length: 11 }, (_, i) => `s${i}`).join(",") })).toMatchObject({ ok: false, field: "specialization" });
  });
});
