// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), queue: [] as unknown[], calls: [] as { table: string; q: Record<string, ReturnType<typeof vi.fn>> }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/service", () => ({ getMyMentee: vi.fn() }));
vi.mock("@/lib/server/assessments/service", () => ({ getStudentAssessments: vi.fn(async () => ({ ok: true, data: [] })) }));
vi.mock("@/lib/server/sessions/service", () => ({ getMyStudentSessions: vi.fn(async () => ({ ok: true, data: [] })) }));

import { getMyMentee } from "@/lib/server/academy-people/service";
import { getActor } from "@/lib/server/auth/guard";
import * as service from "@/lib/server/progress/service";

const ME = "11111111-1111-4111-8111-111111111111";
const STUDENT = "44444444-4444-4444-8444-444444444444";
const OTHER = "66666666-6666-4666-8666-666666666666";
const SESSION = "55555555-5555-4555-8555-555555555555";
const CONTENT = "77777777-7777-4777-8777-777777777777";
const NOW = "2026-10-08T00:00:00.000Z";
const actor = (role: "mentor" | "student" | "academy_admin") => ({ id: ME, email: null, profile: { id: ME, role, fullName: "M", academyId: "acad", status: "active" as const } });

function builder(table: string) {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "upsert", "update", "delete", "eq", "in", "order", "limit"]) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  (q as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  db.calls.push({ table, q });
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(getMyMentee).mockReset();
  db.queue = [];
  db.calls = [];
  db.from.mockReset();
  db.from.mockImplementation((t: string) => builder(t));
});

const scoreRow = (over: Record<string, unknown> = {}) => ({ student_id: STUDENT, assessment_id: "a1", title: "TAT", category: "psychology", score: 6, max_score: 10, score_pct: 60, reviewed_at: "2026-10-01T00:00:00Z", strengths: "Clear", improvement_areas: "", ...over });

describe("role scope", () => {
  it("each view refuses the wrong role before touching the database", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor"));
    expect((await service.getMyProgress(NOW)).error?.code).toBe("unauthorized");
    expect((await service.setContentDone(CONTENT, true)).error?.code).toBe("unauthorized");
    expect((await service.getAcademyPerformance(NOW)).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue(actor("student"));
    expect((await service.markAttendance(SESSION, [])).error?.code).toBe("unauthorized");
    expect((await service.getAttendanceSheet(SESSION)).error?.code).toBe("unauthorized");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("getMyProgress", () => {
  it("reads only the signed-in student's rows and derives the summary", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student"));
    db.queue.push(
      { data: { reviewed_count: 1, sessions_present: 3, sessions_absent: 1, content_completed: 2, last_submission_at: null }, error: null },
      { data: [scoreRow({ student_id: ME })], error: null },
    );
    const res = await service.getMyProgress(NOW);
    expect(res.ok).toBe(true);
    expect(res.data?.summary).toMatchObject({ avgScorePct: 60, attendancePct: 75, contentCompleted: 2 });
    expect(res.data?.recentFeedback).toHaveLength(1);
    for (const c of db.calls.slice(0, 2)) expect(c.q.eq).toHaveBeenCalledWith("student_id", ME);
  });

  it("shows nothing invented when there is no data", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student"));
    db.queue.push({ data: null, error: null }, { data: [], error: null });
    const res = await service.getMyProgress(NOW);
    expect(res.data?.summary).toMatchObject({ avgScorePct: null, attendancePct: null, reviewedCount: 0 });
    expect(res.data?.trend).toEqual([]);
  });
});

describe("getMenteeProgress", () => {
  it("is not found for a student outside the mentor's batches", async () => {
    vi.mocked(getMyMentee).mockResolvedValue({ ok: false, error: { code: "not_found", message: "x" } });
    expect((await service.getMenteeProgress(OTHER)).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("attendance", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));
  const session = (over: Record<string, unknown> = {}) => ({ id: SESSION, batch_id: "b", starts_at: "2020-01-01T00:00:00Z", status: "scheduled", for_whole_batch: true, session_participants: [], ...over });

  it("only the mentor's own session (scoped by mentor_id)", async () => {
    db.queue.push({ data: null, error: null });
    expect((await service.getAttendanceSheet(SESSION)).error?.code).toBe("not_found");
    expect(db.calls[0].q.eq).toHaveBeenCalledWith("mentor_id", ME);
  });

  it("can't be marked before the session starts", async () => {
    db.queue.push({ data: session({ starts_at: "2999-01-01T00:00:00Z" }), error: null }, { data: [{ id: STUDENT, full_name: "S" }], error: null }, { data: [], error: null });
    expect((await service.markAttendance(SESSION, [{ studentId: STUDENT, status: "present" }])).error?.message).toMatch(/once the session has started/);
  });

  it("drops non-participants and invalid statuses; saves the rest", async () => {
    db.queue.push({ data: session(), error: null }, { data: [{ id: STUDENT, full_name: "S" }], error: null }, { data: [], error: null }, { data: null, error: null });
    const res = await service.markAttendance(SESSION, [
      { studentId: STUDENT, status: "present" },
      { studentId: OTHER, status: "present" },
      { studentId: STUDENT, status: "late" },
    ]);
    expect(res.ok).toBe(true);
    const upsert = db.calls.find((c) => c.table === "session_attendance" && c.q.upsert.mock.calls.length)!;
    expect(upsert.q.upsert.mock.calls[0][0]).toEqual([{ session_id: SESSION, student_id: STUDENT, status: "present", marked_by: ME }]);
  });
});

describe("getAcademyPerformance", () => {
  it("aggregates per batch and flags students with a reason", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    db.queue.push(
      { data: [{ id: "b1", name: "Alpha" }], error: null },
      { data: [{ student_id: STUDENT, batch_id: "b1", reviewed_count: 1, sessions_present: 1, sessions_absent: 0, content_completed: 0, last_submission_at: "2026-10-05T00:00:00Z", practice_done: 4 }], error: null },
      { data: [scoreRow({ score_pct: 30 })], error: null },
      { data: [{ id: STUDENT, full_name: "Asha", batch_id: "b1", batch_name: "Alpha" }], error: null },
      { data: [{ batch_id: "b1" }], error: null },
    );
    const res = await service.getAcademyPerformance(NOW);
    expect(res.data?.batches).toEqual([{ batchId: "b1", batchName: "Alpha", students: 1, avgScorePct: 30, attendancePct: 100, reviewedCount: 1, practiceDone: 4 }]);
    expect(res.data?.attention).toEqual([{ studentId: STUDENT, name: "Asha", batchName: "Alpha", reason: expect.stringMatching(/Average score 30%/) }]);
    expect(db.calls[0].q.eq).toHaveBeenCalledWith("academy_id", "acad");
  });
});
