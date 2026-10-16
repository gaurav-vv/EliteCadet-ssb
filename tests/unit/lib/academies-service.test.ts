// @vitest-environment node
// The academies service against a mocked guard + repositories: authorization
// before any data access, membership rules, audit on success only, and the
// academy admin's scope always coming from their session.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({
  authorize: vi.fn(),
  getActor: vi.fn(),
  isGuardFailure: (v: object) => "ok" in v,
}));
vi.mock("@/lib/server/academies/repository", () => ({
  findAcademies: vi.fn(),
  findAcademyById: vi.fn(),
  findAcademyOptions: vi.fn(),
  insertAcademy: vi.fn(),
  updateAcademy: vi.fn(),
  findMembers: vi.fn(),
  findProfileByEmail: vi.fn(),
  setMembership: vi.fn(),
  countMembers: vi.fn().mockResolvedValue({ data: new Map(), error: null }),
  countsFor: () => ({ admins: 0, mentors: 0, students: 0 }),
}));
vi.mock("@/lib/server/users/repository", () => ({
  insertAudit: vi.fn().mockResolvedValue({ data: null, error: null }),
  findAuditForTarget: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

import { authorize, getActor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academies/repository";
import * as service from "@/lib/server/academies/service";
import { insertAudit } from "@/lib/server/users/repository";
import type { AcademyRecord } from "@/types/academies";

const SUPER = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const AC = "33333333-3333-4333-8333-333333333333";
const OTHER_AC = "44444444-4444-4444-8444-444444444444";

const superActor = { id: SUPER, email: "s@x.co", profile: { id: SUPER, role: "super_admin" as const, fullName: "Sam", academyId: null, status: "active" as const } };
const adminActor = { id: USER, email: "a@x.co", profile: { id: USER, role: "academy_admin" as const, fullName: "Ana", academyId: AC, status: "active" as const } };
const denied = { ok: false as const, error: { code: "unauthorized" as const, message: "You don't have permission to do that." } };
const academy: AcademyRecord = { id: AC, name: "Target Defence", description: null, logoUrl: null, contactEmail: null, contactPhone: null, status: "active", createdAt: "2026-10-01T00:00:00Z" };

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(getActor).mockReset();
  for (const fn of [repo.findAcademies, repo.findAcademyById, repo.insertAcademy, repo.updateAcademy, repo.findMembers, repo.findProfileByEmail, repo.setMembership]) vi.mocked(fn).mockReset();
  vi.mocked(insertAudit).mockClear();
});

describe("super-admin operations refuse everyone else before touching data", () => {
  it.each([
    ["getAcademyList", () => service.getAcademyList({ q: "", status: "all", sort: "newest", page: 1 })],
    ["createAcademy", () => service.createAcademy({ name: "New academy" })],
    ["changeAcademyStatus", () => service.changeAcademyStatus(AC, "suspended")],
    ["addAcademyMember", () => service.addAcademyMember(AC, "a@b.co", "student")],
    ["removeAcademyMember", () => service.removeAcademyMember(AC, USER)],
  ])("%s", async (_n, call) => {
    vi.mocked(authorize).mockResolvedValue(denied);
    const res = await call();
    expect(res.error?.code).toBe("unauthorized");
    for (const fn of [repo.findAcademies, repo.findAcademyById, repo.insertAcademy, repo.updateAcademy, repo.setMembership]) expect(fn).not.toHaveBeenCalled();
  });
});

describe("createAcademy", () => {
  it("validates on the server and returns field errors", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    const res = await service.createAcademy({ name: "x", contactEmail: "bad" });
    expect(res.error?.code).toBe("validation_error");
    expect(res.fieldErrors).toMatchObject({ name: expect.any(String), contactEmail: expect.any(String) });
    expect(repo.insertAcademy).not.toHaveBeenCalled();
  });

  it("creates and audits", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    vi.mocked(repo.insertAcademy).mockResolvedValue({ data: { id: AC }, error: null });
    expect(await service.createAcademy({ name: "Target Defence" })).toEqual({ ok: true, data: { id: AC } });
    expect(insertAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "academy.created", targetType: "academy", targetId: AC }));
  });
});

describe("changeAcademyStatus", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("suspends and audits", async () => {
    vi.mocked(repo.findAcademyById).mockResolvedValue({ data: academy, error: null });
    vi.mocked(repo.updateAcademy).mockResolvedValue({ data: 1, error: null });
    expect((await service.changeAcademyStatus(AC, "suspended")).ok).toBe(true);
    expect(repo.updateAcademy).toHaveBeenCalledWith(AC, { status: "suspended" });
    expect(insertAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "academy.suspended" }));
  });

  it("rejects an invalid status and a no-op", async () => {
    expect((await service.changeAcademyStatus(AC, "deleted")).error?.code).toBe("validation_error");
    vi.mocked(repo.findAcademyById).mockResolvedValue({ data: academy, error: null });
    expect((await service.changeAcademyStatus(AC, "active")).error?.code).toBe("validation_error");
    expect(repo.updateAcademy).not.toHaveBeenCalled();
  });
});

describe("addAcademyMember", () => {
  beforeEach(() => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    vi.mocked(repo.findAcademyById).mockResolvedValue({ data: academy, error: null });
  });

  it("refuses an unknown email, a super admin and yourself", async () => {
    vi.mocked(repo.findProfileByEmail).mockResolvedValue({ data: null, error: null });
    expect((await service.addAcademyMember(AC, "ghost@x.co", "student")).error?.code).toBe("not_found");
    vi.mocked(repo.findProfileByEmail).mockResolvedValue({ data: { id: USER, role: "super_admin", academyId: null, fullName: "Root" }, error: null });
    expect((await service.addAcademyMember(AC, "root@x.co", "student")).error?.code).toBe("validation_error");
    vi.mocked(repo.findProfileByEmail).mockResolvedValue({ data: { id: SUPER, role: "student", academyId: null, fullName: "Me" }, error: null });
    expect((await service.addAcademyMember(AC, "me@x.co", "student")).error?.code).toBe("validation_error");
    expect(repo.setMembership).not.toHaveBeenCalled();
  });

  it("refuses an invalid role (including super_admin)", async () => {
    expect((await service.addAcademyMember(AC, "a@x.co", "super_admin")).error?.code).toBe("validation_error");
  });

  it("sets academy + role in one write and audits both sides", async () => {
    vi.mocked(repo.findProfileByEmail).mockResolvedValue({ data: { id: USER, role: "student", academyId: OTHER_AC, fullName: "Asha" }, error: null });
    vi.mocked(repo.setMembership).mockResolvedValue({ data: 1, error: null });
    expect(await service.addAcademyMember(AC, "asha@x.co", "mentor")).toEqual({ ok: true, data: { name: "Asha" } });
    expect(repo.setMembership).toHaveBeenCalledWith(USER, { academy_id: AC, role: "mentor" });
    expect(insertAudit).toHaveBeenCalledTimes(2);
  });
});

describe("removeAcademyMember", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("removes a student", async () => {
    vi.mocked(repo.findMembers).mockResolvedValue({ data: [{ id: USER, fullName: "Asha", email: null, role: "student", status: "active" }], error: null });
    vi.mocked(repo.setMembership).mockResolvedValue({ data: 1, error: null });
    expect((await service.removeAcademyMember(AC, USER)).ok).toBe(true);
    expect(repo.setMembership).toHaveBeenCalledWith(USER, { academy_id: null });
  });

  it("refuses to strand a mentor without an academy, or a non-member", async () => {
    vi.mocked(repo.findMembers).mockResolvedValue({ data: [{ id: USER, fullName: "M", email: null, role: "mentor", status: "active" }], error: null });
    expect((await service.removeAcademyMember(AC, USER)).error?.code).toBe("validation_error");
    vi.mocked(repo.findMembers).mockResolvedValue({ data: [], error: null });
    expect((await service.removeAcademyMember(AC, USER)).error?.code).toBe("not_found");
    expect(repo.setMembership).not.toHaveBeenCalled();
  });
});

describe("academy admin: own academy only", () => {
  it("updates the academy from the session, never from input", async () => {
    vi.mocked(getActor).mockResolvedValue(adminActor);
    vi.mocked(repo.updateAcademy).mockResolvedValue({ data: 1, error: null });
    const res = await service.updateMyAcademy({ name: "Renamed", id: OTHER_AC } as never);
    expect(res.ok).toBe(true);
    expect(repo.updateAcademy).toHaveBeenCalledWith(AC, expect.objectContaining({ name: "Renamed" }));
    expect(repo.updateAcademy).not.toHaveBeenCalledWith(OTHER_AC, expect.anything());
  });

  it("never lets the form change status", async () => {
    vi.mocked(getActor).mockResolvedValue(adminActor);
    vi.mocked(repo.updateAcademy).mockResolvedValue({ data: 1, error: null });
    await service.updateMyAcademy({ name: "Renamed", status: "suspended" } as never);
    expect(vi.mocked(repo.updateAcademy).mock.calls[0][1]).not.toHaveProperty("status");
  });

  it.each([
    ["a mentor", { ...adminActor, profile: { ...adminActor.profile, role: "mentor" as const } }],
    ["an admin without an academy", { ...adminActor, profile: { ...adminActor.profile, academyId: null } }],
    ["nobody", null],
  ])("refuses %s", async (_n, actor) => {
    vi.mocked(getActor).mockResolvedValue(actor);
    expect((await service.updateMyAcademy({ name: "X Academy" })).error?.code).toBe("unauthorized");
    expect((await service.getMyAcademy()).error?.code).toBe("unauthorized");
    expect(repo.updateAcademy).not.toHaveBeenCalled();
  });
});

describe("changeUserAcademy", () => {
  it("refuses your own academy and stranding a mentor", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    expect((await service.changeUserAcademy(SUPER, AC, { role: "student", academyId: null })).error?.code).toBe("validation_error");
    expect((await service.changeUserAcademy(USER, "", { role: "mentor", academyId: AC })).error?.code).toBe("validation_error");
    expect(repo.setMembership).not.toHaveBeenCalled();
  });

  it("moves a student to an existing academy and audits", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    vi.mocked(repo.findAcademyById).mockResolvedValue({ data: academy, error: null });
    vi.mocked(repo.setMembership).mockResolvedValue({ data: 1, error: null });
    expect((await service.changeUserAcademy(USER, AC, { role: "student", academyId: null })).ok).toBe(true);
    expect(insertAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "user.academy_changed", targetId: USER }));
  });
});
