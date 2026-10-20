// Pure dashboard derivations (tests/unit/lib/dashboards-compute.test.ts).
// No I/O; with no data the answer is empty or null, never invented.

import { averagePct } from "@/lib/server/progress/compute";
import { istDayKey } from "@/lib/server/sessions/validation";
import type { AttemptRecord } from "@/types/assessments";
import type { ScorePoint } from "@/types/progress";

const DAY_MS = 86_400_000;

export function isIstToday(iso: string, nowIso: string): boolean {
  return istDayKey(iso) === istDayKey(nowIso);
}

// Sessions starting from now up to `days` ahead (the list is already upcoming-only).
export function countStartingWithin(sessions: { startsAt: string }[], nowIso: string, days: number): number {
  const now = Date.parse(nowIso);
  return sessions.filter((s) => {
    const t = Date.parse(s.startsAt);
    return t - now <= days * DAY_MS;
  }).length;
}

// Submitted but not yet reviewed (no feedback, or a draft review).
export function isPendingReview(t: Pick<AttemptRecord, "status" | "feedback">): boolean {
  return t.status === "submitted" && t.feedback?.status !== "reviewed";
}

const MONTH_FMT = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

// Average reviewed score per IST month, oldest first, last `limit` months that have data.
export function monthlyAverages(points: ScorePoint[], limit = 6): { month: string; avgPct: number; count: number }[] {
  const by = new Map<string, ScorePoint[]>();
  for (const p of points) {
    const key = istDayKey(p.reviewedAt).slice(0, 7);
    by.set(key, [...(by.get(key) ?? []), p]);
  }
  return [...by.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, list]) => ({ month: MONTH_FMT.format(new Date(`${key}-15T00:00:00Z`)), avgPct: averagePct(list) ?? 0, count: list.length }));
}

// Latest reviewed score against the one before it; null until there are two.
export function scoreTrend(points: ScorePoint[]): { last: number | null; trend: "up" | "down" | "flat" | null } {
  const sorted = [...points].sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
  const last = sorted.at(-1)?.scorePct ?? null;
  const prev = sorted.at(-2)?.scorePct;
  if (last === null || prev === undefined) return { last, trend: null };
  return { last, trend: last > prev + 2 ? "up" : last < prev - 2 ? "down" : "flat" };
}

export const SCORE_BUCKETS = [
  { label: "Below 40%", min: 0, max: 40 },
  { label: "40–59%", min: 40, max: 60 },
  { label: "60–79%", min: 60, max: 80 },
  { label: "80% and above", min: 80, max: 101 },
] as const;

// How many students' average score falls in each band; unscored students are left out.
export function scoreBuckets(averages: (number | null)[]): { label: string; count: number }[] {
  const scored = averages.filter((v): v is number => v !== null);
  return SCORE_BUCKETS.map((b) => ({ label: b.label, count: scored.filter((v) => v >= b.min && v < b.max).length }));
}

export function submittedWithin(lastSubmissionAt: string | null, nowIso: string, days: number): boolean {
  return lastSubmissionAt !== null && Date.parse(nowIso) - Date.parse(lastSubmissionAt) <= days * DAY_MS;
}
