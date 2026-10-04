import { describe, expect, it } from "vitest";
import { buildDashboardViewModel } from "@/lib/academy/dashboard-view";
import type { AcademyDashboardData, AcademyMentor, AcademyStudent } from "@/types/academy";

const baseData: AcademyDashboardData = {
  academyName: "Test Academy",
  totalStudents: 3,
  activeBatches: 1,
  totalMentors: 2,
  averageReadiness: 70,
  batchPerformance: [],
  mentorOverview: [],
  attentionStudents: [{ studentId: "s3", fullName: "C", reason: "Marked inactive." }],
  alerts: [{ message: "Batch C has no mentor assigned." }, { message: "1 mentor invitation pending acceptance." }],
};

const students: AcademyStudent[] = [
  { id: "s1", fullName: "A", batchId: null, mentorId: null, status: "active", readiness: 80, lastActivityAt: "2026-09-17T09:00:00.000Z" },
  { id: "s2", fullName: "B", batchId: null, mentorId: null, status: "active", readiness: 45, lastActivityAt: null },
  { id: "s3", fullName: "C", batchId: null, mentorId: null, status: "inactive", readiness: 60, lastActivityAt: "2026-08-29T09:00:00.000Z" },
];

const mentors: AcademyMentor[] = [
  { id: "m1", fullName: "M1", email: "m1@example.com", status: "active", sessionsThisWeek: 1, pendingEvaluations: 2 },
  { id: "m2", fullName: "M2", email: "m2@example.com", status: "invited", sessionsThisWeek: 0, pendingEvaluations: 0 },
];

// Real counts from academy_students (the in-memory `students` above only feed tasks/activity).
const counts = { total: 3, active: 2 };

describe("buildDashboardViewModel", () => {
  it("derives metrics from real counts without inventing deltas", () => {
    const { metrics } = buildDashboardViewModel(baseData, students, mentors, counts);
    expect(metrics.map((m) => m.id)).toEqual(["students", "batches", "mentors", "active-students", "readiness"]);
    expect(metrics.map((m) => m.value)).toEqual(["3", "1", "2", "67%", "70%"]);
    expect(metrics.find((m) => m.id === "mentors")?.detail).toBe("1 invite pending");
  });

  it("uses the real student counts, and shows a load failure instead of in-memory numbers", () => {
    const failed = buildDashboardViewModel(baseData, students, mentors, null).metrics;
    expect(failed.find((m) => m.id === "students")).toMatchObject({ value: "—", detail: "Couldn't load" });
    expect(failed.find((m) => m.id === "active-students")).toMatchObject({ value: "—", detail: "Couldn't load" });
    const real = buildDashboardViewModel(baseData, students, mentors, { total: 10, active: 4 }).metrics;
    expect(real.find((m) => m.id === "students")?.value).toBe("10");
    expect(real.find((m) => m.id === "active-students")).toMatchObject({ value: "40%", detail: "4 of 10 active" });
  });

  it("builds tasks from pending evaluations, attention students and alerts", () => {
    const { tasks } = buildDashboardViewModel(baseData, students, mentors, counts);
    expect(tasks.map((t) => t.id)).toEqual([
      "pending-evaluations",
      "sessions-week",
      "inactive-students",
      "low-performance",
      "alert-0",
      "alert-1",
    ]);
  });

  it("counts only active students below the readiness threshold as low performers", () => {
    const { tasks } = buildDashboardViewModel(baseData, students, mentors, counts);
    // s1 (80) and s3 (inactive) are excluded; only s2 is active, scored and below 60.
    expect(tasks.find((t) => t.id === "low-performance")?.description).toContain("1 student");
  });

  it("returns no tasks and an em dash readiness for an empty academy", () => {
    const empty = { ...baseData, totalStudents: 0, activeBatches: 0, totalMentors: 0, averageReadiness: null, attentionStudents: [], alerts: [] };
    const vm = buildDashboardViewModel(empty, [], [], { total: 0, active: 0 });
    expect(vm.tasks).toEqual([]);
    expect(vm.activity).toEqual([]);
    expect(vm.metrics.find((m) => m.id === "readiness")?.value).toBe("—");
  });

  it("orders activity newest first and skips students with no activity", () => {
    const { activity } = buildDashboardViewModel(baseData, students, mentors, counts);
    expect(activity.map((a) => a.studentId)).toEqual(["s1", "s3"]);
  });
});

describe("readinessBand", () => {
  it("maps readiness to a labelled band at each threshold", async () => {
    const { readinessBand } = await import("@/lib/academy/readiness");
    expect([85, 80, 79, 70, 69, 65, 64, 60, 59].map((v) => readinessBand(v).label)).toEqual([
      "Excellent",
      "Excellent",
      "Good",
      "Good",
      "On track",
      "On track",
      "Needs focus",
      "Needs focus",
      "At risk",
    ]);
  });
});
