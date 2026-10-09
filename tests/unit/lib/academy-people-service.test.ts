// @vitest-environment node
// Academy-people service with a mocked actor + repository: the academy and the
// mentor always come from the session; a mentor only reaches students in their
// own batches; add-by-email never takes another academy's student.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({
  findStudents: vi.fn(),
  countStudents: vi.fn(),
  findStudent: vi.fn(),
  findBatchMentors: vi.fn().mockResolvedValue({ data: [], error: null }),
  addExistingStudent: vi.fn(),
  removeStudent: vi.fn(),
  inviteByEmail: vi.fn(),
  findMentors: vi.fn(),
  findMyBatchIds: vi.fn(),
}));

import { getActor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/academy-people/repository";
import * as service from "@/lib/server/academy-people/service";
import { parseStudentParams } from "@/lib/server/academy-people/validation";
import type { AcademyStudentRecord } from "@/types/academy-people";

const AC = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const STUDENT = "33333333-3333-4333-8333-333333333333";
const MY_BATCH = "44444444-4444-4444-8444-444444444444";
const OTHER_BATCH = "55555555-5555-4555-8555-555555555555";

const actor = (role: "academy_admin" | "mentor" | "student", academyId: string | null = AC) => ({ id: ME, email: null, profile: { id: ME, role, fullName: "Me", academyId, status: "active" as const } });
const student = (over: Partial<AcademyStudentRecord> = {}): AcademyStudentRecord => ({ id: STUDENT, fullName: "Asha", email: "a@x.co", status: "active", batchId: MY_BATCH, batchName: "Alpha", lastLoginAt: null, createdAt: "2026-10-01T00:00:00Z", ...over });
const params = parseStudentParams({});

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  for (const fn of [repo.findStudents, repo.countStudents, repo.findStudent, repo.addExistingStudent, repo.removeStudent, repo.inviteByEmail, repo.findMentors, repo.findMyBatchIds]) vi.mocked(fn).mockReset();
});

describe("academy admin scope", () => {
  it.each([
    ["a mentor", actor("mentor")],
    ["a student", actor("student")],
    ["an admin with no academy", actor("academy_admin", null)],
    ["nobody", null],
  ])("refuses %s everywhere, with no data access", async (_n, a) => {
    vi.mocked(getActor).mockResolvedValue(a);
    expect((await service.getAcademyStudents(params)).error?.code).toBe("unauthorized");
    expect((await service.getAcademyStudent(STUDENT)).error?.code).toBe("unauthorized");
    expect((await service.addAcademyStudent({ email: "a@x.co" }, "http://x")).error?.code).toBe("unauthorized");
    expect((await service.removeAcademyStudent(STUDENT)).error?.code).toBe("unauthorized");
    expect((await service.getAcademyMentors()).error?.code).toBe("unauthorized");
    expect(repo.findStudents).not.toHaveBeenCalled();
    expect(repo.findStudent).not.toHaveBeenCalled();
    expect(repo.addExistingStudent).not.toHaveBeenCalled();
  });

  it("always queries the admin's own academy", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    vi.mocked(repo.findStudents).mockResolvedValue({ data: { rows: [], total: 0 }, error: null });
    vi.mocked(repo.countStudents).mockResolvedValue({ data: { total: 0, inBatch: 0, withoutBatch: 0, suspended: 0 }, error: null });
    await service.getAcademyStudents(params);
    expect(repo.findStudents).toHaveBeenCalledWith(AC, params, 1, undefined);
    vi.mocked(repo.findStudent).mockResolvedValue({ data: null, error: null });
    expect((await service.getAcademyStudent(STUDENT)).error?.code).toBe("not_found");
    expect(repo.findStudent).toHaveBeenCalledWith(AC, STUDENT);
  });
});

describe("addAcademyStudent", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("academy_admin")));

  it("adds an existing unaffiliated student without inviting", async () => {
    vi.mocked(repo.addExistingStudent).mockResolvedValue({ data: { id: STUDENT, fullName: "Asha" }, error: null });
    expect(await service.addAcademyStudent({ email: "A@X.co" }, "http://x")).toEqual({ ok: true, data: { id: STUDENT, name: "Asha", invited: false } });
    expect(repo.addExistingStudent).toHaveBeenCalledWith("a@x.co");
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
  });

  it("asks for a name, then invites, when no account exists", async () => {
    vi.mocked(repo.addExistingStudent).mockResolvedValue({ data: null, error: { code: "P0002" } });
    expect(await service.addAcademyStudent({ email: "new@x.co" }, "http://x")).toMatchObject({ ok: false, field: "fullName" });
    expect(repo.inviteByEmail).not.toHaveBeenCalled();

    vi.mocked(repo.inviteByEmail).mockResolvedValue({ data: { id: STUDENT }, error: null });
    expect(await service.addAcademyStudent({ email: "new@x.co", fullName: "New Person" }, "http://x")).toEqual({ ok: true, data: { id: STUDENT, name: "New Person", invited: true } });
    expect(repo.inviteByEmail).toHaveBeenCalledWith({ email: "new@x.co", fullName: "New Person", role: "student", academyId: AC, redirectTo: "http://x/reset-password" });
  });

  it("never takes another academy's student, nor a non-student account", async () => {
    vi.mocked(repo.addExistingStudent).mockResolvedValue({ data: null, error: { code: "23505" } });
    expect((await service.addAcademyStudent({ email: "a@x.co" }, "http://x")).error?.message).toMatch(/another academy/);
    vi.mocked(repo.addExistingStudent).mockResolvedValue({ data: null, error: { code: "23514" } });
    expect((await service.addAcademyStudent({ email: "a@x.co" }, "http://x")).error?.message).toMatch(/isn't a student/);
    expect(repo.inviteByEmail).not.toHaveBeenCalled();
  });

  it("validates the email before any database call", async () => {
    expect(await service.addAcademyStudent({ email: "bad" }, "http://x")).toMatchObject({ ok: false, field: "email" });
    expect(repo.addExistingStudent).not.toHaveBeenCalled();
  });
});

describe("removeAcademyStudent", () => {
  it("maps 'not in your academy' to not_found", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    vi.mocked(repo.removeStudent).mockResolvedValue({ data: null, error: { code: "P0002" } });
    expect((await service.removeAcademyStudent(STUDENT)).error?.code).toBe("not_found");
  });
});

describe("mentor: own batches only", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));

  it("lists only students in the mentor's batches", async () => {
    vi.mocked(repo.findMyBatchIds).mockResolvedValue({ data: [{ id: MY_BATCH, name: "Alpha" }], error: null });
    vi.mocked(repo.findStudents).mockResolvedValue({ data: { rows: [student()], total: 1 }, error: null });
    const res = await service.getMyMentees(params);
    expect(res.ok).toBe(true);
    expect(repo.findMyBatchIds).toHaveBeenCalledWith(ME);
    expect(repo.findStudents).toHaveBeenCalledWith(AC, params, 1, [MY_BATCH]);
  });

  it("returns not_found for a student in another batch — same as a nonexistent one", async () => {
    vi.mocked(repo.findMyBatchIds).mockResolvedValue({ data: [{ id: MY_BATCH, name: "Alpha" }], error: null });
    vi.mocked(repo.findStudent).mockResolvedValue({ data: student({ batchId: OTHER_BATCH }), error: null });
    expect((await service.getMyMentee(STUDENT)).error?.code).toBe("not_found");
    vi.mocked(repo.findStudent).mockResolvedValue({ data: student({ batchId: null }), error: null });
    expect((await service.getMyMentee(STUDENT)).error?.code).toBe("not_found");
    vi.mocked(repo.findStudent).mockResolvedValue({ data: null, error: null });
    expect((await service.getMyMentee(STUDENT)).error?.code).toBe("not_found");
  });

  it("opens a student in one of the mentor's batches", async () => {
    vi.mocked(repo.findMyBatchIds).mockResolvedValue({ data: [{ id: MY_BATCH, name: "Alpha" }], error: null });
    vi.mocked(repo.findStudent).mockResolvedValue({ data: student(), error: null });
    expect((await service.getMyMentee(STUDENT)).ok).toBe(true);
  });

  it("refuses a non-mentor", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    expect((await service.getMyMentees(params)).error?.code).toBe("unauthorized");
    expect((await service.getMyMentee(STUDENT)).error?.code).toBe("unauthorized");
  });
});
