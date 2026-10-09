// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), queue: [] as unknown[], calls: [] as { table: string; q: Record<string, ReturnType<typeof vi.fn>> }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({ findMyBatchIds: vi.fn(), countStudents: vi.fn() }));
vi.mock("@/lib/server/academy-people/service", () => ({ getAcademyMentors: vi.fn() }));
vi.mock("@/lib/server/academies/service", () => ({ getMyAcademy: vi.fn() }));
vi.mock("@/lib/server/assessments/service", () => ({ getAcademyAssessments: vi.fn(), getMentorAssessments: vi.fn(), getReviewQueue: vi.fn(), getStudentAssessments: vi.fn() }));
vi.mock("@/lib/server/sessions/service", () => ({ getAcademySessions: vi.fn(), getMySessions: vi.fn(), getMyStudentSessions: vi.fn() }));
vi.mock("@/lib/server/progress/service", async (orig) => ({ ...(await orig<typeof import("@/lib/server/progress/service")>()), getAcademyPerformance: vi.fn(), getMyProgress: vi.fn() }));

import { countStudents, findMyBatchIds } from "@/lib/server/academy-people/repository";
import { getAcademyMentors } from "@/lib/server/academy-people/service";
import { getMyAcademy } from "@/lib/server/academies/service";
import { getAcademyAssessments, getMentorAssessments, getReviewQueue, getStudentAssessments } from "@/lib/server/assessments/service";
import { getActor } from "@/lib/server/auth/guard";
import * as service from "@/lib/server/dashboards/service";
import { getAcademyPerformance, getMyProgress } from "@/lib/server/progress/service";
import { getAcademySessions, getMySessions, getMyStudentSessions } from "@/lib/server/sessions/service";

const ME = "11111111-1111-4111-8111-111111111111";
const STUDENT = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-08T06:00:00.000Z";
const actor = (role: "mentor" | "student" | "academy_admin") => ({ id: ME, email: null, profile: { id: ME, role, fullName: "Asha Rao", academyId: "acad", status: "active" as const } });
const ok = <T>(data: T) => ({ ok: true, data });
const summary = { reviewedCount: 0, avgScorePct: null, sessionsPresent: 0, sessionsAbsent: 0, attendancePct: null, contentCompleted: 0, lastSubmissionAt: null };
const session = (id: string, startsAt: string, mentorId = ME) => ({ id, batchId: "b1", batchName: "Alpha", mentorId, mentorName: "M", title: "GD", description: null, startsAt, endsAt: startsAt, mode: "online", meetingUrl: null, location: null, forWholeBatch: true, status: "scheduled", cancelReason: null, participantIds: [] });

function builder(table: string) {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) q[m] = vi.fn(() => q);
  (q as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  db.calls.push({ table, q });
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.queue = [];
  db.calls = [];
  db.from.mockImplementation((t: string) => builder(t));
});

describe("role scope", () => {
  it("each dashboard refuses the wrong role before reading anything", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    expect((await service.getStudentDashboard(NOW)).error?.code).toBe("unauthorized");
    expect((await service.getAcademyDashboard(NOW)).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    expect((await service.getMentorDashboard(NOW)).error?.code).toBe("unauthorized");
    expect(db.from).not.toHaveBeenCalled();
    expect(getMyProgress).not.toHaveBeenCalled();
    expect(getAcademyPerformance).not.toHaveBeenCalled();
  });
});

describe("getStudentDashboard", () => {
  it("builds activity from the student's own submissions and reviews, newest first", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    vi.mocked(getMyProgress).mockResolvedValue(ok({ summary, trend: [], categories: [], strength: null, weakArea: null, recentFeedback: [], recommendations: [] }) as never);
    vi.mocked(getMyStudentSessions).mockResolvedValue(ok([session("s1", "2026-10-09T06:00:00Z")]) as never);
    vi.mocked(getStudentAssessments).mockResolvedValue(
      ok([
        { id: "a1", title: "TAT", maxScore: 10, attempt: { id: "t1", submittedAt: "2026-10-01T00:00:00Z", feedback: { status: "reviewed", reviewedAt: "2026-10-03T00:00:00Z", score: 7 } } },
        { id: "a2", title: "WAT", maxScore: 10, attempt: { id: "t2", submittedAt: null, feedback: null } },
      ]) as never,
    );
    const res = await service.getStudentDashboard(NOW);
    expect(res.data?.firstName).toBe("Asha");
    expect(res.data?.nextSession?.id).toBe("s1");
    expect(res.data?.recentActivity.map((a) => a.title)).toEqual(['Feedback on "TAT"', 'Submitted "TAT"']);
    expect(res.data?.recentActivity[0].detail).toBe("Score 7/10");
  });
});

describe("getMentorDashboard", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor") as never));

  it("with no batches: zero mentees and no student query", async () => {
    vi.mocked(findMyBatchIds).mockResolvedValue({ data: [], error: null });
    vi.mocked(getMySessions).mockResolvedValue(ok([]) as never);
    vi.mocked(getReviewQueue).mockResolvedValue(ok([]) as never);
    vi.mocked(getMentorAssessments).mockResolvedValue(ok([]) as never);
    const res = await service.getMentorDashboard(NOW);
    expect(res.data).toMatchObject({ menteeCount: 0, pendingReviews: 0, avgScorePct: null, mentees: [], attention: [] });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("reads only students in the mentor's batches; counts pending reviews and today's sessions", async () => {
    vi.mocked(findMyBatchIds).mockResolvedValue({ data: [{ id: "b1", name: "Alpha" }], error: null });
    vi.mocked(getMySessions).mockResolvedValue(ok([session("today", "2026-10-08T12:00:00Z"), session("later", "2026-10-20T12:00:00Z")]) as never);
    vi.mocked(getReviewQueue).mockResolvedValue(
      ok([
        { id: "t1", status: "submitted", feedback: null, studentName: "S", assessmentTitle: "TAT", submittedAt: "2026-10-07T00:00:00Z" },
        { id: "t2", status: "submitted", feedback: { status: "reviewed" }, studentName: "S", assessmentTitle: "WAT", submittedAt: "2026-10-01T00:00:00Z" },
      ]) as never,
    );
    vi.mocked(getMentorAssessments).mockResolvedValue(ok([{ batchId: "b1", status: "published" }]) as never);
    db.queue.push(
      { data: [{ id: STUDENT, full_name: "Sam", batch_id: "b1", batch_name: "Alpha" }], error: null },
      { data: [{ student_id: STUDENT, reviewed_count: 2, sessions_present: 0, sessions_absent: 0, content_completed: 0, last_submission_at: "2026-10-07T00:00:00Z" }], error: null },
      {
        data: [
          { student_id: STUDENT, assessment_id: "a", title: "A", category: "gto", score: 3, max_score: 10, score_pct: 30, reviewed_at: "2026-10-01T00:00:00Z" },
          { student_id: STUDENT, assessment_id: "b", title: "B", category: "gto", score: 4, max_score: 10, score_pct: 40, reviewed_at: "2026-10-05T00:00:00Z" },
        ],
        error: null,
      },
    );
    const res = await service.getMentorDashboard(NOW);
    expect(db.calls[0].q.in).toHaveBeenCalledWith("batch_id", ["b1"]);
    expect(res.data).toMatchObject({ menteeCount: 1, pendingReviews: 1, sessionsNext7Days: 1, avgScorePct: 35 });
    expect(res.data?.todaysSessions.map((s) => s.id)).toEqual(["today"]);
    expect(res.data?.reviewQueue.map((t) => t.attemptId)).toEqual(["t1"]);
    expect(res.data?.mentees[0]).toMatchObject({ avgScorePct: 35, lastScorePct: 40, trend: "up" });
    expect(res.data?.attention[0].reason).toMatch(/Average score 35%/);
  });
});

describe("getAcademyDashboard", () => {
  it("scopes to the admin's academy and derives workload per mentor", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin") as never);
    vi.mocked(getMyAcademy).mockResolvedValue(ok({ name: "Real Academy" }) as never);
    vi.mocked(getAcademyPerformance).mockResolvedValue(
      ok({
        batches: [{ batchId: "b1", batchName: "Alpha", students: 1, avgScorePct: 72, attendancePct: null, reviewedCount: 1 }],
        attention: [],
        academy: { ...summary, reviewedCount: 1, avgScorePct: 72 },
        students: [{ studentId: STUDENT, name: "Sam", batchName: "Alpha", summary: { ...summary, avgScorePct: 72, lastSubmissionAt: "2026-10-06T00:00:00Z" } }],
        points: [],
      }) as never,
    );
    vi.mocked(countStudents).mockResolvedValue({ data: { total: 3, inBatch: 1, withoutBatch: 2, suspended: 0 }, error: null });
    vi.mocked(getAcademyMentors).mockResolvedValue(ok([{ id: ME, fullName: "Mentor", email: null, status: "active", invited: false, batches: [{ id: "b1", name: "Alpha" }] }]) as never);
    vi.mocked(getAcademySessions).mockResolvedValue(ok([session("s1", "2026-10-09T06:00:00Z")]) as never);
    vi.mocked(getAcademyAssessments).mockResolvedValue(ok([{ mentorId: ME, submitted: 3, reviewed: 1 }]) as never);
    db.queue.push({ data: [{ id: "b1", name: "Alpha", mentor_count: 1, student_count: 1 }, { id: "b2", name: "Bravo", mentor_count: 0, student_count: 0 }], error: null });

    const res = await service.getAcademyDashboard(NOW);
    expect(countStudents).toHaveBeenCalledWith("acad");
    expect(db.calls[0].q.eq).toHaveBeenCalledWith("academy_id", "acad");
    expect(res.data).toMatchObject({ academyName: "Real Academy", totalStudents: 3, activeBatches: 2, batchesWithoutMentor: 1, pendingReviews: 2, sessionsNext7Days: 1, activeStudents14Days: 1 });
    expect(res.data?.batches).toEqual([
      { batchId: "b1", name: "Alpha", studentCount: 1, avgScorePct: 72 },
      { batchId: "b2", name: "Bravo", studentCount: 0, avgScorePct: null },
    ]);
    expect(res.data?.mentors).toEqual([{ mentorId: ME, name: "Mentor", invited: false, batches: 1, sessionsNext7Days: 1, pendingReviews: 2 }]);
    expect(res.data?.scoreBuckets.map((b) => b.count)).toEqual([0, 0, 1, 0]);
  });
});
