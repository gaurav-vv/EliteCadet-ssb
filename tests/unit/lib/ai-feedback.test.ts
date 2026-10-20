// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), queue: [] as unknown[], calls: [] as { table: string; q: Record<string, ReturnType<typeof vi.fn>> }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/service", () => ({ getMyMentee: vi.fn() }));

import { getMyMentee } from "@/lib/server/academy-people/service";
import { getActor } from "@/lib/server/auth/guard";
import { feedbackState, getMenteePsychologyAttempt, getMyPsychologyAttempt, getMyPsychologyHistory, toEvaluation } from "@/lib/server/ai/feedback";

const ME = "11111111-1111-4111-8111-111111111111";
const ATT = "22222222-2222-4222-8222-222222222222";
const actor = (role: string) => ({ id: ME, email: null, profile: { id: ME, role, fullName: "S", academyId: "a", status: "active" } });
const evalRow = {
  dimensions: [{ dimension: "action", name: "Action toward the goal", rating: "developing", confidence: "medium", evidence: ["he plans"], note: "Most stories act." }],
  feedback: { observation: "o", evidence: "e", impact: "i", improvement_action: "a", recommended_practice: "p" },
  overall_confidence: "medium",
  created_at: "2026-10-19T00:00:00Z",
};

function builder(table: string) {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) q[m] = vi.fn(() => q);
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

describe("boundary validation", () => {
  it("always labels an evaluation as an AI practice evaluation", () => {
    expect(toEvaluation(evalRow)).toMatchObject({ label: "AI-generated practice evaluation", overallConfidence: "medium" });
    expect(toEvaluation(evalRow)?.dimensions[0]).toEqual({ id: "action", name: "Action toward the goal", rating: "developing", confidence: "medium", evidence: ["he plans"], note: "Most stories act." });
  });

  it("drops malformed evaluations and unknown ratings instead of half-rendering", () => {
    expect(toEvaluation({ ...evalRow, feedback: { observation: "o" } })).toBeNull();
    expect(toEvaluation({ ...evalRow, dimensions: [{ ...evalRow.dimensions[0], rating: "92%" }] })).toBeNull();
  });

  it("maps job + evaluation to a feedback state", () => {
    expect(feedbackState(undefined, undefined)).toEqual({ status: "none" });
    expect(feedbackState({ status: "queued" }, undefined)).toEqual({ status: "pending" });
    expect(feedbackState({ status: "failed" }, undefined)).toEqual({ status: "pending" });
    expect(feedbackState({ status: "dead" }, undefined)).toEqual({ status: "unavailable" });
    expect(feedbackState({ status: "succeeded" }, evalRow).status).toBe("ready");
  });
});

describe("scope", () => {
  it("only a student opens their own attempt", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    expect((await getMyPsychologyAttempt(ATT)).error?.code).toBe("unauthorized");
    expect((await getMyPsychologyHistory()).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    expect((await getMyPsychologyAttempt("not-a-uuid")).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("filters by the caller's id and only shows psychology tests", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    db.queue.push({ data: { id: ATT, bank_slug: "interview", mode: "mock", answers: [], submitted_at: "t" }, error: null });
    expect((await getMyPsychologyAttempt(ATT)).error?.code).toBe("not_found");
    expect(db.calls[0].q.eq).toHaveBeenCalledWith("student_id", ME);
  });

  it("returns answers from the job snapshot plus the ready feedback", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    db.queue.push(
      { data: { id: ATT, bank_slug: "tat", mode: "test", answers: [{ itemId: "x", response: "He plans" }], submitted_at: "2026-10-19T00:00:00Z" }, error: null },
      { data: [{ status: "succeeded", input: { items: [{ prompt: "A figure on a hill", response: "He plans" }] } }], error: null },
      { data: [evalRow], error: null },
    );
    const res = await getMyPsychologyAttempt(ATT);
    expect(res.data).toMatchObject({ test: "tat", items: [{ prompt: "A figure on a hill", response: "He plans" }], feedback: { status: "ready" } });
  });

  it("a mentor sees only a mentee's attempt", async () => {
    vi.mocked(getMyMentee).mockResolvedValue({ ok: false, error: { code: "not_found", message: "x" } });
    expect((await getMenteePsychologyAttempt(ME, ATT)).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();
  });
});
