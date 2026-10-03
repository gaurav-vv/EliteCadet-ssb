import { describe, expect, it } from "vitest";
import {
  buildStudentListHref,
  buildStudentRows,
  DEFAULT_STUDENT_PARAMS,
  parseStudentListParams,
  queryStudents,
  summarizeStudents,
} from "@/lib/academy/student-list";
import type { AcademyBatch, AcademyMentor, AcademyStudent, AttentionStudent } from "@/types/academy";

const students: AcademyStudent[] = [
  { id: "s1", fullName: "Priya Nair", batchId: "b1", mentorId: "m1", status: "active", readiness: 74, lastActivityAt: "2026-09-17T09:00:00.000Z" },
  { id: "s2", fullName: "Rohit Verma", batchId: "b1", mentorId: "m1", status: "active", readiness: 58, lastActivityAt: "2026-09-13T09:00:00.000Z" },
  { id: "s3", fullName: "Sneha Iyer", batchId: "b2", mentorId: null, status: "active", readiness: null, lastActivityAt: null },
  { id: "s4", fullName: "Aman Gupta", batchId: null, mentorId: null, status: "inactive", readiness: 85, lastActivityAt: "2026-08-29T09:00:00.000Z" },
];
const batches: AcademyBatch[] = [
  { id: "b1", name: "Alpha", mentorId: "m1", studentIds: ["s1", "s2"] },
  { id: "b2", name: "Bravo", mentorId: null, studentIds: ["s3"] },
];
const mentors: AcademyMentor[] = [
  { id: "m1", fullName: "Kavita Sharma", email: "k@example.com", status: "active", sessionsThisWeek: 0, pendingEvaluations: 0 },
];
const attention: AttentionStudent[] = [
  { studentId: "s2", fullName: "Rohit Verma", reason: "No practice activity for 6 days." },
  { studentId: "s3", fullName: "Sneha Iyer", reason: "No practice activity since joining." },
  { studentId: "s4", fullName: "Aman Gupta", reason: "Marked inactive." },
];

const rows = buildStudentRows(students, batches, mentors, attention);
const query = (patch: Partial<typeof DEFAULT_STUDENT_PARAMS>) => queryStudents(rows, { ...DEFAULT_STUDENT_PARAMS, ...patch });
const names = (r: ReturnType<typeof query>) => r.rows.map((x) => x.fullName);

describe("buildStudentRows", () => {
  it("joins batch and mentor names and derives status from real fields", () => {
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.s1).toMatchObject({ batchName: "Alpha", mentorName: "Kavita Sharma", status: "active", initials: "PN" });
    expect(byId.s2.status).toBe("attention");
    expect(byId.s2.attentionReason).toBe("No practice activity for 6 days.");
    expect(byId.s3).toMatchObject({ mentorName: null, readiness: null, status: "attention" });
    // An inactive student stays "inactive" even though the attention rule lists them.
    expect(byId.s4).toMatchObject({ status: "inactive", attentionReason: null, batchName: null });
  });
});

describe("summarizeStudents", () => {
  it("counts over all students", () => {
    expect(summarizeStudents(rows)).toEqual({ total: 4, active: 3, withoutBatch: 1, needingAttention: 2 });
  });
});

describe("queryStudents", () => {
  it("searches by name, case-insensitively", () => {
    expect(names(query({ q: "pRiYa" }))).toEqual(["Priya Nair"]);
  });

  it("combines search, batch and status filters", () => {
    expect(names(query({ q: "r", batch: "b1", status: "active" }))).toEqual(["Priya Nair"]);
    expect(names(query({ q: "Priya", batch: "b2" }))).toEqual([]);
  });

  it("filters unassigned batch/mentor", () => {
    expect(names(query({ batch: "none" }))).toEqual(["Aman Gupta"]);
    expect(names(query({ mentor: "none" }))).toEqual(["Aman Gupta", "Sneha Iyer"]);
  });

  it("filters by performance band, treating missing scores as not assessed", () => {
    expect(names(query({ performance: "unassessed" }))).toEqual(["Sneha Iyer"]);
    expect(names(query({ performance: "below60" }))).toEqual(["Rohit Verma"]);
    expect(names(query({ performance: "60to79" }))).toEqual(["Priya Nair"]);
    expect(names(query({ performance: "80plus" }))).toEqual(["Aman Gupta"]);
  });

  it("sorts, putting missing values last", () => {
    expect(names(query({ sort: "performance" }))).toEqual(["Aman Gupta", "Priya Nair", "Rohit Verma", "Sneha Iyer"]);
    expect(names(query({ sort: "activity" }))).toEqual(["Priya Nair", "Rohit Verma", "Aman Gupta", "Sneha Iyer"]);
    expect(names(query({ sort: "recent" }))).toEqual(["Aman Gupta", "Sneha Iyer", "Rohit Verma", "Priya Nair"]);
  });

  it("paginates and clamps an out-of-range page", () => {
    const result = queryStudents(rows, { ...DEFAULT_STUDENT_PARAMS, page: 9 }, 3);
    expect(result).toMatchObject({ total: 4, pageCount: 2, page: 2 });
    expect(result.rows).toHaveLength(1);
  });
});

describe("params <-> URL", () => {
  it("falls back to defaults for invalid values", () => {
    expect(parseStudentListParams({ status: "bogus", sort: "x", page: "-3", performance: "??" })).toEqual(DEFAULT_STUDENT_PARAMS);
  });

  it("round-trips non-default params and omits defaults", () => {
    const href = buildStudentListHref({ q: "Priya", batch: "b1", page: 2 });
    expect(href).toBe("/academy/students?q=Priya&batch=b1&page=2");
    const parsed = parseStudentListParams(Object.fromEntries(new URL(href, "http://x").searchParams));
    expect(parsed).toMatchObject({ q: "Priya", batch: "b1", page: 2, status: "all" });
    expect(buildStudentListHref({})).toBe("/academy/students");
  });
});
