// @vitest-environment node
import { describe, expect, it } from "vitest";
import { attendancePct, attentionReason, averagePct, categoryAverages, sortAttention, strengthAndWeakArea, summarize, trendOf } from "@/lib/server/progress/compute";
import type { ScorePoint } from "@/types/progress";

const point = (over: Partial<ScorePoint>): ScorePoint => ({
  assessmentId: "a",
  title: "T",
  category: "psychology",
  scorePct: 50,
  score: 5,
  maxScore: 10,
  reviewedAt: "2026-10-01T00:00:00.000Z",
  improvementAreas: null,
  strengths: null,
  ...over,
});
const NOW = "2026-10-08T00:00:00.000Z";
const base = { avgScorePct: 70, reviewedCount: 2, lastSubmissionAt: "2026-10-05T00:00:00.000Z", attendancePct: 80 };

describe("progress derivations — never invent a value", () => {
  it("attendance excludes excused and is null when nothing is marked", () => {
    expect(attendancePct(0, 0)).toBeNull();
    expect(attendancePct(2, 1)).toBe(66.7);
    expect(attendancePct(3, 0)).toBe(100);
  });

  it("average is null with no reviewed scores", () => {
    expect(averagePct([])).toBeNull();
    expect(averagePct([{ scorePct: 40 }, { scorePct: 81 }])).toBe(60.5);
  });

  it("trend is chronological by review time", () => {
    const t = trendOf([point({ assessmentId: "b", reviewedAt: "2026-10-03T00:00:00Z" }), point({ assessmentId: "a", reviewedAt: "2026-10-01T00:00:00Z" })]);
    expect(t.map((p) => p.assessmentId)).toEqual(["a", "b"]);
  });

  it("category averages, best first; strength/weak area need two areas", () => {
    const cats = categoryAverages([point({ category: "gto", scorePct: 80 }), point({ category: "psychology", scorePct: 40 }), point({ category: "psychology", scorePct: 60 })]);
    expect(cats).toEqual([
      { category: "gto", avgPct: 80, count: 1 },
      { category: "psychology", avgPct: 50, count: 2 },
    ]);
    expect(strengthAndWeakArea(cats)).toEqual({ strength: cats[0], weakArea: cats[1] });
    expect(strengthAndWeakArea(cats.slice(0, 1))).toEqual({ strength: null, weakArea: null });
  });

  it("summarize takes counts from the row and the average from the points", () => {
    const s = summarize({ reviewedCount: 1, sessionsPresent: 1, sessionsAbsent: 1, contentCompleted: 3, lastSubmissionAt: null }, [point({ scorePct: 90 })]);
    expect(s).toMatchObject({ avgScorePct: 90, attendancePct: 50, contentCompleted: 3 });
  });
});

describe("needs-attention rules — each flag says why", () => {
  const ctx = { nowIso: NOW, batchHadOpenAssessment: true };

  it("flags a low average only once something is reviewed", () => {
    expect(attentionReason({ ...base, avgScorePct: 42 }, ctx)).toMatch(/Average score 42%/);
    expect(attentionReason({ ...base, avgScorePct: null, reviewedCount: 0 }, { ...ctx, batchHadOpenAssessment: false })).toBeNull();
  });

  it("flags no / no recent submissions only while assessments are open", () => {
    expect(attentionReason({ ...base, lastSubmissionAt: null }, ctx)).toMatch(/No assessment submitted/);
    expect(attentionReason({ ...base, lastSubmissionAt: "2026-09-01T00:00:00Z" }, ctx)).toMatch(/No submission in 14 days/);
    expect(attentionReason({ ...base, lastSubmissionAt: null }, { ...ctx, batchHadOpenAssessment: false })).toBeNull();
  });

  it("flags low attendance; an on-track student isn't flagged", () => {
    expect(attentionReason({ ...base, attendancePct: 40 }, ctx)).toMatch(/Attendance 40%/);
    expect(attentionReason(base, ctx)).toBeNull();
  });

  it("sorts flagged students by name", () => {
    const list = sortAttention([
      { studentId: "2", name: "Zed", batchName: null, reason: "r" },
      { studentId: "1", name: "Asha", batchName: null, reason: "r" },
    ]);
    expect(list.map((s) => s.name)).toEqual(["Asha", "Zed"]);
  });
});
