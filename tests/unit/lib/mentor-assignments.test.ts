// @vitest-environment node
// Assigning students to independent mentors (migration 0034): super admin only, independent mentor +
// academy-less student only, duplicates refused, every change audited.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ authorize: vi.fn(), getActor: vi.fn(), isGuardFailure: (v: object) => "ok" in v }));
vi.mock("@/lib/server/mentor-assignments/repository", () => ({
  findPerson: vi.fn(),
  findAssigned: vi.fn(),
  searchStudents: vi.fn(),
  insertAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  insertAudit: vi.fn(async () => ({ data: null, error: null })),
}));

import { authorize } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/mentor-assignments/repository";
import { assignStudent, getMentorAssignments, searchAssignableStudents, unassignStudent } from "@/lib/server/mentor-assignments/service";
import { assignmentErrorMessage, checkAssignment } from "@/lib/server/mentor-assignments/validation";
import { can } from "@/lib/server/permissions/rbac";

const SUPER = "11111111-1111-4111-8111-111111111111";
const MENTOR = "22222222-2222-4222-8222-222222222222";
const STUDENT = "33333333-3333-4333-8333-333333333333";
const ACADEMY = "aaaaaaaa-0000-4000-8000-00000000000a";
const denied = { ok: false as const, error: { code: "unauthorized" as const, message: "You don't have permission to do that." } };
const superActor = { id: SUPER, email: null, profile: { id: SUPER, role: "super_admin" as const, fullName: "S", academyId: null, status: "active" as const } };
const person = (role: string, academyId: string | null, name = "Someone") => ({ data: { id: "x", role, academyId, fullName: name, email: null }, error: null });

beforeEach(() => {
  for (const fn of Object.values(repo)) if (typeof fn === "function" && "mockReset" in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
  vi.mocked(repo.insertAudit).mockResolvedValue({ data: null, error: null });
});

describe("who may assign students", () => {
  it("is a super-admin permission only", () => {
    expect(can("super_admin", "mentors.assign_students")).toBe(true);
    for (const role of ["academy_admin", "mentor", "student"] as const) expect(can(role, "mentors.assign_students")).toBe(false);
  });

  it("refuses every operation the guard refuses, before touching the database", async () => {
    vi.mocked(authorize).mockResolvedValue(denied);
    for (const result of [await getMentorAssignments(MENTOR), await searchAssignableStudents(MENTOR, ""), await assignStudent(MENTOR, STUDENT), await unassignStudent(MENTOR, STUDENT)]) {
      expect(result.error?.code).toBe("unauthorized");
    }
    expect(authorize).toHaveBeenCalledWith("mentors.assign_students");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
    expect(repo.deleteAssignment).not.toHaveBeenCalled();
    expect(repo.findAssigned).not.toHaveBeenCalled();
  });
});

describe("checkAssignment", () => {
  it("accepts an independent mentor and an academy-less student", () => {
    expect(checkAssignment({ role: "mentor", academyId: null }, { role: "student", academyId: null })).toEqual({ ok: true });
  });

  it("refuses an academy mentor, an academy student and the wrong roles", () => {
    expect(checkAssignment({ role: "mentor", academyId: ACADEMY }, { role: "student", academyId: null })).toMatchObject({ ok: false, message: expect.stringMatching(/belongs to an academy/i) });
    expect(checkAssignment({ role: "mentor", academyId: null }, { role: "student", academyId: ACADEMY })).toMatchObject({ ok: false, message: expect.stringMatching(/belongs to an academy/i) });
    expect(checkAssignment({ role: "student", academyId: null }, { role: "student", academyId: null }).ok).toBe(false);
    expect(checkAssignment({ role: "mentor", academyId: null }, { role: "mentor", academyId: null }).ok).toBe(false);
    expect(checkAssignment(null, { role: "student", academyId: null }).ok).toBe(false);
    expect(checkAssignment({ role: "mentor", academyId: null }, null).ok).toBe(false);
  });

  it("explains database errors in plain language", () => {
    expect(assignmentErrorMessage("23505")).toMatch(/already assigned/i);
    expect(assignmentErrorMessage("23514")).toMatch(/can't be assigned/i);
    expect(assignmentErrorMessage("XX000")).toBeNull();
  });
});

describe("assignStudent", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("assigns, records who did it, and audits against the mentor", async () => {
    vi.mocked(repo.findPerson).mockResolvedValueOnce(person("mentor", null)).mockResolvedValueOnce(person("student", null, "Asha Rao"));
    vi.mocked(repo.insertAssignment).mockResolvedValue({ data: null, error: null });
    expect(await assignStudent(MENTOR, STUDENT)).toEqual({ ok: true, data: { studentName: "Asha Rao" } });
    expect(repo.insertAssignment).toHaveBeenCalledWith(MENTOR, STUDENT, SUPER);
    expect(repo.insertAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: SUPER, action: "mentor.student_assigned", targetId: MENTOR, details: expect.objectContaining({ studentId: STUDENT }) }));
  });

  it("refuses an academy mentor or academy student without writing", async () => {
    vi.mocked(repo.findPerson).mockResolvedValueOnce(person("mentor", ACADEMY)).mockResolvedValueOnce(person("student", null));
    expect((await assignStudent(MENTOR, STUDENT)).error?.code).toBe("validation_error");
    vi.mocked(repo.findPerson).mockResolvedValueOnce(person("mentor", null)).mockResolvedValueOnce(person("student", ACADEMY));
    expect((await assignStudent(MENTOR, STUDENT)).error?.code).toBe("validation_error");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
    expect(repo.insertAudit).not.toHaveBeenCalled();
  });

  it("turns a duplicate (primary-key violation, also a concurrent double click) into a clear message and does not audit", async () => {
    vi.mocked(repo.findPerson).mockResolvedValueOnce(person("mentor", null)).mockResolvedValueOnce(person("student", null));
    vi.mocked(repo.insertAssignment).mockResolvedValue({ data: null, error: { code: "23505" } });
    const result = await assignStudent(MENTOR, STUDENT);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/already assigned/i);
    expect(repo.insertAudit).not.toHaveBeenCalled();
  });

  it("rejects ids that are not UUIDs", async () => {
    expect((await assignStudent("nope", STUDENT)).error?.code).toBe("validation_error");
    expect((await assignStudent(MENTOR, "'; drop table x; --")).error?.code).toBe("validation_error");
    expect(repo.findPerson).not.toHaveBeenCalled();
  });
});

describe("unassignStudent", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("removes the assignment and audits it", async () => {
    vi.mocked(repo.deleteAssignment).mockResolvedValue({ data: 1, error: null });
    expect(await unassignStudent(MENTOR, STUDENT)).toEqual({ ok: true, data: null });
    expect(repo.insertAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "mentor.student_unassigned", targetId: MENTOR }));
  });

  it("says so when the student wasn't assigned, and does not audit", async () => {
    vi.mocked(repo.deleteAssignment).mockResolvedValue({ data: 0, error: null });
    expect((await unassignStudent(MENTOR, STUDENT)).error?.code).toBe("not_found");
    expect(repo.insertAudit).not.toHaveBeenCalled();
  });
});

describe("searchAssignableStudents", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("excludes the students the mentor already has", async () => {
    vi.mocked(repo.findAssigned).mockResolvedValue({ data: [{ id: STUDENT, fullName: "A", email: null, assignedAt: "" }], error: null });
    vi.mocked(repo.searchStudents).mockResolvedValue({ data: [], error: null });
    await searchAssignableStudents(MENTOR, "asha");
    expect(repo.searchStudents).toHaveBeenCalledWith("asha", [STUDENT]);
  });
});
