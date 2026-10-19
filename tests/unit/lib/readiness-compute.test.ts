// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildReadiness, levelFromAiAverage, levelFromPct, toSignals } from "@/lib/server/readiness/compute";
import type { ReadinessSignals } from "@/types/readiness";

const NOW = "2026-10-19T06:00:00Z";
const empty = (over: Partial<ReadinessSignals> = {}): ReadinessSignals => ({
  accountCreatedAt: "2026-09-01T00:00:00Z",
  mentor: [],
  ai: [],
  practice: { done28d: 0, tests28d: 0, interviews28d: 0, repeatsAfterFeedback28d: 0 },
  library28d: 0,
  attendance: { present: 0, absent: 0 },
  activeDays28: 0,
  activeDays7: 0,
  ...over,
});
const dim = (s: ReadinessSignals, id: string, audience: "student" | "mentor" | "academy" = "student") => buildReadiness(s, NOW, audience).dimensions.find((d) => d.id === id)!;
const ai = (rubricId: string, dimension: string, rating: "strong" | "developing" | "needs_attention", n = 1, confidence: "low" | "medium" | "high" = "medium", recent = true) => ({ rubricId, dimension, rating, confidence, recent, n });

describe("readiness profile", () => {
  it("always has the seven PRD dimensions, never a single score", () => {
    const p = buildReadiness(empty(), NOW);
    expect(p.dimensions.map((d) => d.id)).toEqual(["communication", "self_awareness", "interview", "psychology", "gto", "revision", "consistency"]);
    expect(JSON.stringify(p)).not.toMatch(/"(score|readiness)"\s*:\s*\d/);
  });

  it("says 'not enough evidence' rather than guessing", () => {
    const p = buildReadiness(empty({ accountCreatedAt: "2026-10-15T00:00:00Z" }), NOW);
    expect(p.dimensions.every((d) => d.state === "not_enough_evidence")).toBe(true);
    expect(dim(empty({ mentor: [{ category: "psychology", n: 1, avgPct: 80, recentAvg: 80, previousAvg: null }] }), "psychology").state).toBe("not_enough_evidence");
  });

  it("thresholds: mentor percentages and AI rating averages", () => {
    expect([levelFromPct(70), levelFromPct(69.9), levelFromPct(45), levelFromPct(44)]).toEqual(["strong", "developing", "developing", "needs_attention"]);
    expect([levelFromAiAverage(1.4), levelFromAiAverage(1), levelFromAiAverage(0.5)]).toEqual(["strong", "developing", "needs_attention"]);
  });

  it("a mentor's reviews lead once there are two; AI feedback fills in before that", () => {
    const s = empty({
      mentor: [{ category: "psychology", n: 3, avgPct: 52, recentAvg: 52, previousAvg: null }],
      ai: [ai("psychology-tat", "action", "strong", 6, "high")],
    });
    expect(dim(s, "psychology").state).toBe("developing");
    expect(dim(empty({ ai: [ai("psychology-tat", "action", "strong", 3, "high")] }), "psychology").state).toBe("strong");
  });

  it("marks clear recent improvement as Improving (mentor trend, else AI trend)", () => {
    expect(dim(empty({ mentor: [{ category: "interview", n: 6, avgPct: 55, recentAvg: 64, previousAvg: 50 }] }), "interview").state).toBe("improving");
    expect(dim(empty({ mentor: [{ category: "interview", n: 6, avgPct: 55, recentAvg: 56, previousAvg: 54 }] }), "interview").state).toBe("developing");
    const s = empty({ ai: [ai("interview", "relevance", "developing", 2, "medium", true), ai("interview", "relevance", "needs_attention", 3, "medium", false)] });
    expect(dim(s, "interview").state).toBe("improving");
    // Strong is never shown as improving.
    expect(dim(empty({ mentor: [{ category: "gto", n: 6, avgPct: 80, recentAvg: 90, previousAvg: 70 }] }), "gto").state).toBe("strong");
  });

  it("maps AI rubric dimensions to the right readiness dimensions", () => {
    const s = empty({ ai: [ai("interview", "structure", "strong", 2), ai("interview", "reflection", "needs_attention", 2), ai("psychology-sdt", "balance", "needs_attention", 1)] });
    expect(dim(s, "communication").state).toBe("strong");
    expect(dim(s, "self_awareness").state).toBe("needs_attention");
    expect(dim(s, "interview").state).toBe("not_enough_evidence");
  });

  it("low-confidence AI alone never yields high confidence", () => {
    const s = empty({ ai: [ai("psychology-wat", "action", "strong", 12, "low")] });
    expect(dim(s, "psychology").confidence).toBe("low");
    expect(dim(empty({ mentor: [{ category: "psychology", n: 4, avgPct: 60, recentAvg: 60, previousAvg: null }], ai: [ai("psychology-wat", "action", "developing", 8)] }), "psychology").confidence).toBe("high");
  });

  it("consistency comes from active days", () => {
    expect(dim(empty({ activeDays28: 14, activeDays7: 4 }), "consistency").state).toBe("strong");
    expect(dim(empty({ activeDays28: 7, activeDays7: 1 }), "consistency").state).toBe("developing");
    expect(dim(empty({ activeDays28: 5, activeDays7: 4 }), "consistency").state).toBe("improving");
    expect(dim(empty({ activeDays28: 2, activeDays7: 0 }), "consistency").state).toBe("needs_attention");
    expect(dim(empty({ activeDays28: 0 }), "consistency").state).toBe("needs_attention");
    expect(dim(empty({ activeDays28: 0, accountCreatedAt: "2026-10-12T00:00:00Z" }), "consistency").state).toBe("not_enough_evidence");
  });

  it("revision comes from retaking tests after feedback and reading", () => {
    const fb = { mentor: [{ category: "psychology", n: 1, avgPct: 50, recentAvg: 50, previousAvg: null }] };
    expect(dim(empty({ ...fb, practice: { done28d: 0, tests28d: 2, interviews28d: 0, repeatsAfterFeedback28d: 2 }, library28d: 3 }), "revision").state).toBe("strong");
    expect(dim(empty({ ...fb, library28d: 1 }), "revision").state).toBe("developing");
    expect(dim(empty(fb), "revision").state).toBe("needs_attention");
  });

  it("students get evidence and a next step; mentors evidence only; academy admins states only", () => {
    const s = empty({ mentor: [{ category: "psychology", n: 2, avgPct: 50, recentAvg: 50, previousAvg: null }] });
    expect(dim(s, "psychology").evidence[0]).toBe("2 mentor reviews averaging 50%");
    expect(dim(s, "psychology").next).toMatch(/TAT/);
    expect(dim(s, "psychology", "mentor")).toMatchObject({ next: null, evidence: ["2 mentor reviews averaging 50%"] });
    expect(dim(s, "psychology", "academy")).toMatchObject({ state: "developing", evidence: [], next: null });
  });

  it("validates the database JSON at the boundary", () => {
    const s = toSignals({ mentor: [{ category: "gto", n: "2", avg_pct: "61.5" }, { n: 1 }], ai: [{ rubric_id: "interview", dimension: "x", rating: "92%", confidence: "high", n: 1 }], active_days_28: null });
    expect(s.mentor).toEqual([{ category: "gto", n: 2, avgPct: 61.5, recentAvg: null, previousAvg: null }]);
    expect(s.ai).toEqual([]);
    expect(s.activeDays28).toBe(0);
  });
});
