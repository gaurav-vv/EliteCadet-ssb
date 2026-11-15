// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: db.rpc, from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({ findMyBatchIds: vi.fn() }));

import { getStudentAssessments } from "@/lib/server/assessments/service";
import { getActor } from "@/lib/server/auth/guard";
import { getMyStudentSessions } from "@/lib/server/sessions/service";

const ME = "11111111-1111-4111-8111-111111111111";
const actor = { id: ME, email: null, profile: { id: ME, role: "student" as const, fullName: "S", academyId: "a", status: "active" as const } };

beforeEach(() => {
  db.rpc.mockReset();
  db.from.mockReset();
  vi.mocked(getActor).mockResolvedValue(actor as never);
});

const assessmentRow = (over: Record<string, unknown> = {}) => ({
  id: "a1", batch_id: "b1", mentor_id: "m1", title: "TAT", instructions: null, category: "psychology", questions: [{ id: "q1", prompt: "Write" }], max_score: 10, due_at: null, status: "published", created_at: "2026-10-01T00:00:00Z",
  batch_name: "Batch A", mentor_name: "Mentor M", attempt_id: null, attempt_answers: null, attempt_status: null, attempt_submitted_at: null, student_name: "S", student_email: "s@x.in",
  feedback_id: null, feedback_score: null, feedback_strengths: null, feedback_improvement_areas: null, feedback_comments: null, feedback_status: null, feedback_reviewed_at: null, feedback_mentor_name: null, ...over,
});

describe("getStudentAssessments (one database function)", () => {
  it("reads once through my_assessments and rebuilds assessment, attempt and reviewed feedback", async () => {
    db.rpc.mockResolvedValue({ data: [assessmentRow(), assessmentRow({ id: "a2", attempt_id: "t1", attempt_answers: [{ questionId: "q1", answer: "x" }], attempt_status: "submitted", attempt_submitted_at: "2026-10-02T00:00:00Z", feedback_id: "f1", feedback_score: 7, feedback_status: "reviewed", feedback_reviewed_at: "2026-10-03T00:00:00Z", feedback_mentor_name: "Mentor M" })], error: null });
    const res = await getStudentAssessments();
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith("my_assessments");
    expect(db.from).not.toHaveBeenCalled();
    expect(res.data?.[0]).toMatchObject({ id: "a1", batchName: "Batch A", mentorName: "Mentor M", attempt: null });
    expect(res.data?.[1].attempt).toMatchObject({ id: "t1", studentId: ME, status: "submitted", feedback: { score: 7, status: "reviewed", mentorName: "Mentor M" } });
  });

  it("falls back to the table reads when the function is not installed yet", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "not found" } });
    const q: Record<string, unknown> = {};
    for (const m of ["select", "neq", "order", "limit", "eq"]) q[m] = vi.fn(() => q);
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
    db.from.mockImplementation(() => q);
    const res = await getStudentAssessments();
    expect(res.ok).toBe(true);
    expect(db.from).toHaveBeenCalledWith("assessments");
    expect(db.from).toHaveBeenCalledWith("assessment_attempts");
  });

  it("reports a real database error instead of silently falling back", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { code: "57014", message: "timeout" } });
    expect((await getStudentAssessments()).ok).toBe(false);
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("getMyStudentSessions (one database function)", () => {
  it("passes the filter and time, and maps host name and participants", async () => {
    db.rpc.mockResolvedValue({ data: [{ id: "s1", batch_id: "b1", mentor_id: "m1", title: "GD", description: null, starts_at: "2026-10-10T10:00:00Z", ends_at: "2026-10-10T11:00:00Z", mode: "online", meeting_url: null, location: null, for_whole_batch: false, status: "scheduled", cancel_reason: null, meeting_kind: null, actual_started_at: null, actual_ended_at: null, ended_early: false, batch_name: "Batch A", host_name: "Mentor M", participant_ids: ["p1", "p2"] }], error: null });
    const res = await getMyStudentSessions("past", "2026-10-08T00:00:00.000Z");
    expect(db.rpc).toHaveBeenCalledWith("my_sessions", { p_filter: "past", p_now: "2026-10-08T00:00:00.000Z" });
    expect(res.data?.[0]).toMatchObject({ id: "s1", batchName: "Batch A", mentorName: "Mentor M", participantIds: ["p1", "p2"], forWholeBatch: false });
  });

  it("refuses anyone who is not a student before reading", async () => {
    vi.mocked(getActor).mockResolvedValue({ ...actor, profile: { ...actor.profile, role: "mentor" } } as never);
    expect((await getMyStudentSessions("upcoming", "2026-10-08T00:00:00.000Z")).error?.code).toBe("unauthorized");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
