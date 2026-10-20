// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), queue: [] as unknown[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: db.rpc, from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { cleanDiagnosticAnswers, getDiagnosticForm, getMyDiagnosticOverview, sectionOf, submitDiagnostic } from "@/lib/server/diagnostic/service";

function builder() {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}
const student = { id: "u1", email: null, profile: { id: "u1", role: "student", fullName: "S", academyId: null, status: "active" } };

beforeEach(() => {
  vi.mocked(getActor).mockReset().mockResolvedValue(student as never);
  db.queue = [];
  db.rpc.mockReset();
  db.from.mockReset().mockImplementation(() => builder());
});

describe("diagnostic", () => {
  it("knows what each item measures from its key", () => {
    expect(["dk-1", "dr-2", "dw-comm-1", "dw-sit-2", "dw-self-1"].map(sectionOf)).toEqual(["knowledge", "reasoning", "communication", "situational_reasoning", "self_awareness"]);
  });

  it("never sends the correct options to the browser", async () => {
    db.queue.push({ data: [{ key: "dk-1", bank_slug: "diagnostic-mcq", prompt: "Q", options: [{ id: "a", label: "A" }], correct_option_id: "a" }], error: null });
    const r = await getDiagnosticForm();
    expect(JSON.stringify(r.data)).not.toContain("correct");
    expect(r.data?.[0]).toEqual({ key: "dk-1", section: "knowledge", prompt: "Q", options: [{ id: "a", label: "A" }] });
  });

  it("validates answers and explains the once-a-week rule", async () => {
    expect(cleanDiagnosticAnswers([{ key: "dk-1", optionId: "dk-1-a" }, { key: "dw-sit-1", response: "Help them" }])).toHaveLength(2);
    expect(cleanDiagnosticAnswers([{ key: "zz-1" }])).toBeNull();
    expect(cleanDiagnosticAnswers([{ key: "dw-sit-1", response: "x".repeat(2001) }])).toBeNull();
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: "23514", message: "once a week" } });
    expect((await submitDiagnostic([{ key: "dk-1", optionId: "a" }])).error?.message).toBe("You can retake the diagnostic once a week.");
  });

  it("separates the baseline from the latest re-assessment and knows when the next attempt is allowed", async () => {
    db.queue.push({ data: [{ id: "r2", kind: "reassessment", sections: { knowledge: { correct: 4, total: 4 } }, submitted_at: "2026-10-17T00:00:00Z" }, { id: "b1", kind: "baseline", sections: { knowledge: { correct: 2, total: 4 } }, submitted_at: "2026-09-01T00:00:00Z" }], error: null }, { data: [], error: null });
    const r = await getMyDiagnosticOverview("2026-10-19T00:00:00Z");
    expect(r.data?.baseline?.id).toBe("b1");
    expect(r.data?.baseline?.knowledge).toEqual({ correct: 2, total: 4 });
    expect(r.data?.latest?.id).toBe("r2");
    expect(r.data?.nextAllowedAt).toBe("2026-10-24T00:00:00.000Z");
  });

  it("only students take it", async () => {
    vi.mocked(getActor).mockResolvedValue({ ...student, profile: { ...student.profile, role: "mentor" } } as never);
    expect((await submitDiagnostic([])).error?.code).toBe("unauthorized");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
