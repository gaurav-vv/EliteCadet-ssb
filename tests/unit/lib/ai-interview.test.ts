// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), queue: [] as unknown[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from, rpc: db.rpc }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/service", () => ({ getMyMentee: vi.fn() }));

import { getMyMentee } from "@/lib/server/academy-people/service";
import { getActor } from "@/lib/server/auth/guard";
import { answerTurn, cleanPiqContext, getMenteeInterview, getMyInterview, skipWait, startInterview, toTurn } from "@/lib/server/ai/interview";

const ME = "11111111-1111-4111-8111-111111111111";
const SID = "22222222-2222-4222-8222-222222222222";
const TID = "33333333-3333-4333-8333-333333333333";
const actor = (role: string) => ({ id: ME, email: null, profile: { id: ME, role, fullName: "S", academyId: "a", status: "active" } });

function builder() {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(getMyMentee).mockReset();
  db.queue = [];
  db.from.mockReset();
  db.rpc.mockReset();
  db.from.mockImplementation(() => builder());
  db.rpc.mockResolvedValue({ data: SID, error: null });
});

describe("validation", () => {
  it("shares only known PIQ fields, trimmed and capped", () => {
    expect(cleanPiqContext({ hometown: " Pune ", sports: "", secret: "x", hobbies: "a".repeat(500) })).toEqual({ hometown: "Pune", hobbies: "a".repeat(200) });
    expect(cleanPiqContext(null)).toEqual({});
  });

  it("drops malformed turns", () => {
    expect(toTurn({ id: TID, seq: 2, question: "Why?", kind: "follow_up", follow_up_type: "depth", answer: null, answered_at: null })).toMatchObject({ followUpType: "depth" });
    expect(toTurn({ id: TID, seq: 2, question: "Why?", kind: "weird" })).toBeNull();
  });
});

describe("student actions", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("student") as never));

  it("starts a session with cleaned PIQ context; topic mode needs a topic", async () => {
    expect((await startInterview("mock", null, { hometown: "Pune", other: "x" })).data).toEqual({ id: SID });
    expect(db.rpc).toHaveBeenCalledWith("start_interview_session", { p_mode: "mock", p_topic: null, p_context: { hometown: "Pune" } });
    expect((await startInterview("topic", null, null)).error?.code).toBe("validation_error");
    expect((await startInterview("chat", null, null)).error?.code).toBe("validation_error");
  });

  it("answers through the database function and explains an already-answered question", async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect((await answerTurn(TID, "My answer")).ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("answer_interview_turn", { p_turn: TID, p_answer: "My answer" });
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: "23514", message: "no longer open" } });
    expect((await answerTurn(TID, "again")).error?.message).toMatch(/already answered/);
    expect((await answerTurn(TID, "x".repeat(3001))).error?.code).toBe("validation_error");
  });

  it("nobody but a student can act", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    expect((await startInterview("mock", null, null)).error?.code).toBe("unauthorized");
    expect((await answerTurn(TID, "a")).error?.code).toBe("unauthorized");
    expect((await skipWait(SID)).error?.code).toBe("unauthorized");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe("reading an interview", () => {
  it("marks the session as waiting once the last question is answered", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    db.queue.push(
      { data: { id: SID, mode: "guided", topic_slug: null, max_questions: 5, status: "active", created_at: "t", topic: null }, error: null },
      { data: [{ id: TID, seq: 1, question: "Tell us about yourself.", kind: "opening", follow_up_type: null, answer: "Hi", answered_at: "2026-10-19T06:00:00Z" }], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    const r = await getMyInterview(SID);
    expect(r.data).toMatchObject({ status: "active", waitingSince: "2026-10-19T06:00:00Z", feedback: { status: "none" } });
  });

  it("a mentor sees only a mentee's interview", async () => {
    vi.mocked(getMyMentee).mockResolvedValue({ ok: false, error: { code: "not_found", message: "x" } });
    expect((await getMenteeInterview(ME, SID)).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();
  });
});
