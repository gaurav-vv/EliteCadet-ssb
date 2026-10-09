// @vitest-environment node
import { describe, expect, it } from "vitest";
import { countStartingWithin, isIstToday, isPendingReview, monthlyAverages, scoreBuckets, scoreTrend, submittedWithin } from "@/lib/server/dashboards/compute";
import type { ScorePoint } from "@/types/progress";

const NOW = "2026-10-08T06:00:00.000Z"; // 11:30 IST, 8 Oct
const pt = (scorePct: number, reviewedAt: string): ScorePoint => ({ assessmentId: reviewedAt, title: "T", category: "gto", scorePct, score: 0, maxScore: 10, reviewedAt, improvementAreas: null, strengths: null });

describe("dashboard derivations", () => {
  it("'today' is the IST calendar day", () => {
    expect(isIstToday("2026-10-08T18:00:00.000Z", NOW)).toBe(true); // 23:30 IST
    expect(isIstToday("2026-10-08T19:00:00.000Z", NOW)).toBe(false); // 00:30 IST next day
  });

  it("counts sessions starting within the window", () => {
    const s = [{ startsAt: "2026-10-09T06:00:00.000Z" }, { startsAt: "2026-10-15T05:00:00.000Z" }, { startsAt: "2026-10-16T06:00:00.000Z" }];
    expect(countStartingWithin(s, NOW, 7)).toBe(2);
  });

  it("a submission is pending until its review is final", () => {
    expect(isPendingReview({ status: "submitted", feedback: null })).toBe(true);
    expect(isPendingReview({ status: "submitted", feedback: { status: "in_review" } as never })).toBe(true);
    expect(isPendingReview({ status: "submitted", feedback: { status: "reviewed" } as never })).toBe(false);
    expect(isPendingReview({ status: "draft", feedback: null })).toBe(false);
  });

  it("monthly averages group by IST month, oldest first, months with data only", () => {
    const m = monthlyAverages([pt(40, "2026-09-30T20:00:00Z"), pt(60, "2026-09-10T00:00:00Z"), pt(80, "2026-08-01T00:00:00Z")]);
    // 30 Sep 20:00 UTC is 1 Oct in IST.
    expect(m).toEqual([
      { month: "Aug 2026", avgPct: 80, count: 1 },
      { month: "Sept 2026", avgPct: 60, count: 1 },
      { month: "Oct 2026", avgPct: 40, count: 1 },
    ]);
    expect(monthlyAverages([])).toEqual([]);
  });

  it("trend needs two reviewed scores and ignores small changes", () => {
    expect(scoreTrend([pt(50, "2026-10-01T00:00:00Z")])).toEqual({ last: 50, trend: null });
    expect(scoreTrend([pt(50, "2026-10-01T00:00:00Z"), pt(60, "2026-10-02T00:00:00Z")]).trend).toBe("up");
    expect(scoreTrend([pt(60, "2026-10-02T00:00:00Z"), pt(50, "2026-10-01T00:00:00Z")]).trend).toBe("up");
    expect(scoreTrend([pt(50, "2026-10-01T00:00:00Z"), pt(51, "2026-10-02T00:00:00Z")]).trend).toBe("flat");
    expect(scoreTrend([]).last).toBeNull();
  });

  it("buckets only scored students", () => {
    expect(scoreBuckets([null, 39.9, 40, 79.9, 80, 100]).map((b) => b.count)).toEqual([1, 1, 1, 2]);
  });

  it("recent submission window", () => {
    expect(submittedWithin(null, NOW, 14)).toBe(false);
    expect(submittedWithin("2026-09-30T00:00:00Z", NOW, 14)).toBe(true);
    expect(submittedWithin("2026-09-01T00:00:00Z", NOW, 14)).toBe(false);
  });
});
