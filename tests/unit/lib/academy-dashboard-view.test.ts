import { describe, expect, it } from "vitest";
import { buildDashboardViewModel } from "@/lib/academy/dashboard-view";
import type { AcademyDashboard } from "@/types/dashboards";

const empty: AcademyDashboard = {
  academyName: "Test Academy",
  totalStudents: 0,
  studentsInBatch: 0,
  activeBatches: 0,
  batchesWithoutMentor: 0,
  mentorCount: 0,
  pendingInvites: 0,
  summary: { reviewedCount: 0, avgScorePct: null, sessionsPresent: 0, sessionsAbsent: 0, attendancePct: null, contentCompleted: 0, lastSubmissionAt: null },
  pendingReviews: 0,
  sessionsNext7Days: 0,
  monthlyScores: [],
  categories: [],
  scoreBuckets: [],
  batches: [],
  attention: [],
  recentActivity: [],
  upcomingSessions: [],
  mentors: [],
  activeStudents14Days: 0,
};

const busy: AcademyDashboard = {
  ...empty,
  totalStudents: 5,
  studentsInBatch: 3,
  activeBatches: 2,
  batchesWithoutMentor: 1,
  mentorCount: 2,
  pendingInvites: 1,
  summary: { ...empty.summary, reviewedCount: 4, avgScorePct: 61.5, sessionsPresent: 3, sessionsAbsent: 1, attendancePct: 75 },
  pendingReviews: 2,
  sessionsNext7Days: 3,
  attention: [{ studentId: "s1", name: "A", batchName: null, reason: "Average score 40% (below 50%)" }],
};

describe("academy dashboard view model — real values only", () => {
  it("shows dashes, not numbers, when there is nothing to measure", () => {
    const { metrics, tasks } = buildDashboardViewModel(empty);
    expect(metrics.map((m) => m.value)).toEqual(["0", "0", "0", "—", "—"]);
    expect(metrics.find((m) => m.id === "score")?.detail).toBe("No reviewed assessments yet");
    expect(tasks).toEqual([]);
  });

  it("derives metric values and details from the counts", () => {
    const { metrics } = buildDashboardViewModel(busy);
    expect(metrics.map((m) => m.value)).toEqual(["5", "2", "2", "61.5%", "75%"]);
    expect(metrics.find((m) => m.id === "batches")?.detail).toBe("1 batch without a mentor");
    expect(metrics.find((m) => m.id === "attendance")?.detail).toBe("3 present of 4 marked");
  });

  it("lists actionable tasks, most urgent first, each linking to where it's fixed", () => {
    const { tasks } = buildDashboardViewModel(busy);
    expect(tasks.map((t) => [t.id, t.href])).toEqual([
      ["attention", "/academy/performance"],
      ["pending-reviews", "/academy/assessments"],
      ["no-mentor", "/academy/batches"],
      ["no-batch", "/academy/students?batch=none"],
      ["invites", "/academy/mentors"],
      ["sessions", "/academy/sessions"],
    ]);
    expect(tasks.find((t) => t.id === "no-batch")?.description).toBe("2 students not in a batch yet");
  });
});
