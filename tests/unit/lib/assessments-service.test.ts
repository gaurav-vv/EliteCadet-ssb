// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), queue: [] as unknown[], calls: [] as { table: string; method: string; args: unknown[] }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({ findMyBatchIds: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import * as service from "@/lib/server/assessments/service";

const ME = "11111111-1111-4111-8111-111111111111";
const BATCH = "22222222-2222-4222-8222-222222222222";
const A = "33333333-3333-4333-8333-333333333333";
const T = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-08T00:00:00.000Z";
const actor = (role: "mentor" | "student") => ({ id: ME, email: null, profile: { id: ME, role, fullName: "X", academyId: "ac", status: "active" as const } });
const assessmentRow = (over: Record<string, unknown> = {}) => ({ id: A, batch_id: BATCH, mentor_id: ME, title: "SRT", category: "psychology", questions: [{ id: "q1", prompt: "Your train is late." }], max_score: 10, due_at: null, status: "published", created_at: "t", ...over });

function builder(table: string) {
  const result = db.queue.shift() ?? { data: null, error: null };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "eq", "neq", "order", "limit"]) {
    q[m] = vi.fn((...args: unknown[]) => {
      db.calls.push({ table, method: m, args });
      return q;
    });
  }
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(findMyBatchIds).mockReset();
  db.queue = [];
  db.calls = [];
  db.from.mockReset();
  db.from.mockImplementation((t: string) => builder(t));
});

describe("mentor", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));
  const input = { batchId: BATCH, title: "SRT set", instructions: "", category: "psychology", questions: ["Your train is late and you have an exam."], maxScore: "10", dueDate: "" };

  it("creates assessments only for batches the mentor teaches", async () => {
    vi.mocked(findMyBatchIds).mockResolvedValue({ data: [{ id: "other", name: "B" }], error: null });
    expect((await service.createAssessment(input, NOW)).fieldErrors).toMatchObject({ batchId: expect.any(String) });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("won't edit an assessment once it's open", async () => {
    db.queue.push({ data: assessmentRow({ status: "published" }), error: null }, { data: [], error: null });
    expect((await service.updateAssessment(A, input, NOW)).error?.message).toMatch(/Only a draft/);
  });

  it("allows only draft→open, open→closed, closed→open", async () => {
    db.queue.push({ data: assessmentRow({ status: "draft" }), error: null }, { data: [], error: null });
    expect((await service.changeAssessmentStatus(A, "closed")).error?.code).toBe("validation_error");
  });

  it("saves feedback as an upsert on attempt_id (one per attempt), and refuses once reviewed", async () => {
    const attempt = { id: T, assessment_id: A, student_id: "s", answers: [], status: "submitted", feedback: null };
    db.queue.push({ data: attempt, error: null }, { data: assessmentRow(), error: null }, { data: null, error: null });
    expect((await service.saveFeedback(T, { score: "8", strengths: "Calm", improvementAreas: "Speed" }, true)).ok).toBe(true);
    const upsert = db.calls.find((c) => c.method === "upsert");
    expect(upsert?.table).toBe("feedback");
    expect(upsert?.args[0]).toMatchObject({ attempt_id: T, mentor_id: ME, status: "reviewed", score: 8 });
    expect(upsert?.args[1]).toEqual({ onConflict: "attempt_id" });

    db.queue.push({ data: { ...attempt, feedback: { id: "f", status: "reviewed" } }, error: null }, { data: assessmentRow(), error: null });
    expect((await service.saveFeedback(T, { score: "9", strengths: "x y z", improvementAreas: "a b c" }, true)).error?.message).toMatch(/already been reviewed/);
  });

  it("treats an attempt outside the mentor's batches (RLS-hidden) as not found", async () => {
    db.queue.push({ data: null, error: null });
    expect((await service.getAttemptForReview(T)).error?.code).toBe("not_found");
  });
});

describe("student", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("student")));

  it("can't answer a closed or overdue assessment", async () => {
    db.queue.push({ data: assessmentRow({ status: "closed" }), error: null }, { data: null, error: null });
    expect((await service.saveAttempt(A, [], false, NOW)).error?.message).toMatch(/isn't open/);
    db.queue.push({ data: assessmentRow({ due_at: "2026-10-01T00:00:00.000Z" }), error: null }, { data: null, error: null });
    expect((await service.saveAttempt(A, [], false, NOW)).error?.message).toMatch(/isn't open/);
  });

  it("can't submit twice", async () => {
    db.queue.push({ data: assessmentRow(), error: null }, { data: { id: T, assessment_id: A, student_id: ME, answers: [], status: "submitted" }, error: null });
    expect((await service.saveAttempt(A, [{ questionId: "q1", answer: "x" }], true, NOW)).error?.message).toMatch(/already submitted/);
  });

  it("refuses an empty submission but saves a draft, upserting its own row", async () => {
    db.queue.push({ data: assessmentRow(), error: null }, { data: null, error: null });
    expect((await service.saveAttempt(A, [], true, NOW)).error?.message).toMatch(/at least one/);
    db.queue.push({ data: assessmentRow(), error: null }, { data: null, error: null }, { data: null, error: null });
    expect(await service.saveAttempt(A, [{ questionId: "q1", answer: "Stay calm" }], false, NOW)).toEqual({ ok: true, data: { unanswered: 0 } });
    const upsert = db.calls.find((c) => c.method === "upsert");
    expect(upsert?.args[0]).toMatchObject({ assessment_id: A, student_id: ME, status: "draft" });
  });

  it("mentor operations refuse a student", async () => {
    expect((await service.getMentorAssessments()).error?.code).toBe("unauthorized");
    expect((await service.saveFeedback(T, {}, false)).error?.code).toBe("unauthorized");
  });
});
