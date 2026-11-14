// @vitest-environment node
// Independent mentors (specs.md §8a.1): only a super admin can invite a mentor
// with no academy; an academy admin's invite always carries their own academy.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ authorize: vi.fn(), getActor: vi.fn(), isGuardFailure: (v: object) => "ok" in v }));
vi.mock("@/lib/server/academy-people/repository", () => ({ inviteByEmail: vi.fn(), findAccountByEmail: vi.fn(), auditAsService: vi.fn(async () => undefined) }));
vi.mock("@/lib/server/users/repository", () => ({ insertAudit: vi.fn(async () => ({ data: null, error: null })) }));

import { authorize, getActor } from "@/lib/server/auth/guard";
import { findAccountByEmail, inviteByEmail } from "@/lib/server/academy-people/repository";
import { decideInvite } from "@/lib/server/academy-people/validation";
import { inviteAcademyMentor } from "@/lib/server/academy-people/service";
import { can } from "@/lib/server/permissions/rbac";
import * as usersRepo from "@/lib/server/users/repository";
import { inviteIndependentMentor } from "@/lib/server/users/service";

const SUPER = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const NEW_ID = "33333333-3333-4333-8333-333333333333";
const ACADEMY = "aaaaaaaa-0000-4000-8000-00000000000a";
const denied = { ok: false as const, error: { code: "unauthorized" as const, message: "You don't have permission to do that." } };
const superActor = { id: SUPER, email: null, profile: { id: SUPER, role: "super_admin" as const, fullName: "S", academyId: null, status: "active" as const } };
const input = { email: "Mentor@Example.test", fullName: "Indie Mentor" };

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(getActor).mockReset();
  vi.mocked(inviteByEmail).mockReset();
  vi.mocked(findAccountByEmail).mockReset();
  vi.mocked(findAccountByEmail).mockResolvedValue({ data: null, error: null });
  vi.mocked(usersRepo.insertAudit).mockClear();
});

describe("who may invite an independent mentor", () => {
  it("is a super-admin permission only", () => {
    expect(can("super_admin", "users.invite_mentor")).toBe(true);
    for (const role of ["academy_admin", "mentor", "student"] as const) expect(can(role, "users.invite_mentor")).toBe(false);
  });

  it("refuses anyone the guard refuses, before sending anything", async () => {
    vi.mocked(authorize).mockResolvedValue(denied);
    expect((await inviteIndependentMentor(input, "http://localhost:3000")).error?.code).toBe("unauthorized");
    expect(authorize).toHaveBeenCalledWith("users.invite_mentor");
    expect(inviteByEmail).not.toHaveBeenCalled();
  });
});

describe("inviteIndependentMentor", () => {
  it("invites a mentor with NO academy, to the set-password page, and audits it", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    vi.mocked(inviteByEmail).mockResolvedValue({ data: { id: NEW_ID }, error: null });
    expect(await inviteIndependentMentor(input, "http://localhost:3000")).toEqual({ ok: true, data: { name: "Indie Mentor", resent: false } });
    expect(inviteByEmail).toHaveBeenCalledWith({ email: "mentor@example.test", fullName: "Indie Mentor", role: "mentor", academyId: null, redirectTo: "http://localhost:3000/reset-password" });
    expect(usersRepo.insertAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: SUPER, action: "user.invited", targetId: NEW_ID }));
  });

  it("validates input and explains an existing account", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    expect((await inviteIndependentMentor({ email: "nope", fullName: "X Y" }, "http://x")).field).toBe("email");
    vi.mocked(findAccountByEmail).mockResolvedValue({ data: { id: NEW_ID, role: "student", academyId: ACADEMY, pending: false, invitedAt: "2026-10-20T00:00:00Z" }, error: null });
    expect((await inviteIndependentMentor(input, "http://x")).error?.message).toMatch(/already belongs to a student in an academy/);
    expect(inviteByEmail).not.toHaveBeenCalled();
    expect(usersRepo.insertAudit).not.toHaveBeenCalled();
  });
});

describe("academy admins stay inside their academy", () => {
  it("always invites into the admin's own academy, never an independent mentor", async () => {
    vi.mocked(getActor).mockResolvedValue({ id: ADMIN, email: null, profile: { id: ADMIN, role: "academy_admin", fullName: "A", academyId: ACADEMY, status: "active" } });
    vi.mocked(inviteByEmail).mockResolvedValue({ data: { id: NEW_ID }, error: null });
    await inviteAcademyMentor({ ...input, academyId: null } as never, "http://x");
    expect(inviteByEmail).toHaveBeenCalledWith(expect.objectContaining({ role: "mentor", academyId: ACADEMY }));
  });

  it("refuses non-admins", async () => {
    vi.mocked(getActor).mockResolvedValue({ id: ADMIN, email: null, profile: { id: ADMIN, role: "mentor", fullName: "M", academyId: null, status: "active" } });
    expect((await inviteAcademyMentor(input, "http://x")).error?.code).toBe("unauthorized");
    expect(inviteByEmail).not.toHaveBeenCalled();
  });
});

describe("decideInvite — an existing account is never silently kept in the wrong role", () => {
  const acct = (over: Partial<{ role: string; academyId: string | null; pending: boolean }> = {}) => ({ id: NEW_ID, role: "mentor", academyId: ACADEMY, pending: true, invitedAt: "2026-10-20T00:00:00Z", ...over });
  it("invites a new address", () => expect(decideInvite(null, { role: "mentor", academyId: ACADEMY })).toEqual({ kind: "invite" }));
  it("re-sends an unaccepted invite for the same role and academy", () => expect(decideInvite(acct(), { role: "mentor", academyId: ACADEMY })).toEqual({ kind: "resend" }));
  it("refuses an active account that already is that mentor", () => expect(decideInvite(acct({ pending: false }), { role: "mentor", academyId: ACADEMY })).toEqual({ kind: "refuse", reason: "same_academy_active" }));
  it("refuses a pending STUDENT invite (Auth would only re-send the student invite)", () =>
    expect(decideInvite(acct({ role: "student" }), { role: "mentor", academyId: ACADEMY })).toEqual({ kind: "refuse", reason: "other_account" }));
  it("refuses another academy's pending mentor, and an academy mentor for an independent invite", () => {
    expect(decideInvite(acct({ academyId: "other" }), { role: "mentor", academyId: ACADEMY }).kind).toBe("refuse");
    expect(decideInvite(acct(), { role: "mentor", academyId: null }).kind).toBe("refuse");
  });
});

describe("inviteAcademyMentor with an existing account", () => {
  const adminActor = { id: ADMIN, email: null, profile: { id: ADMIN, role: "academy_admin" as const, fullName: "A", academyId: ACADEMY, status: "active" as const } };
  it("re-sends a pending invite to the same academy and says so", async () => {
    vi.mocked(getActor).mockResolvedValue(adminActor);
    vi.mocked(findAccountByEmail).mockResolvedValue({ data: { id: NEW_ID, role: "mentor", academyId: ACADEMY, pending: true, invitedAt: "2026-10-20T00:00:00Z" }, error: null });
    vi.mocked(inviteByEmail).mockResolvedValue({ data: { id: NEW_ID }, error: null });
    expect((await inviteAcademyMentor(input, "http://x")).data).toEqual({ name: "Indie Mentor", resent: true });
  });
  it("refuses — without revealing details — an address that is a student or in another academy", async () => {
    vi.mocked(getActor).mockResolvedValue(adminActor);
    vi.mocked(findAccountByEmail).mockResolvedValue({ data: { id: NEW_ID, role: "student", academyId: "elsewhere", pending: true, invitedAt: "2026-10-20T00:00:00Z" }, error: null });
    const res = await inviteAcademyMentor(input, "http://x");
    expect(res.error?.message).toMatch(/already has an EliteCadet account/);
    expect(res.error?.message).not.toMatch(/student|elsewhere/);
    expect(inviteByEmail).not.toHaveBeenCalled();
  });
  it("explains a missing service-role key instead of a generic failure", async () => {
    vi.mocked(getActor).mockResolvedValue(adminActor);
    vi.mocked(findAccountByEmail).mockResolvedValue({ data: null, error: { code: "admin_unavailable" } });
    expect((await inviteAcademyMentor(input, "http://x")).error?.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
