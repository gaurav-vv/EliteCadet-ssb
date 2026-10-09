// Pure progress derivations (tests/unit/lib/progress-compute.test.ts). No I/O:
// the service feeds these with database rows. Nothing here invents a value —
// with no data the answer is null, which the UI shows as "not enough data yet".

import type { AttentionStudent, CategoryAverage, ProgressSummary, ScorePoint } from "@/types/progress";

const round1 = (n: number) => Math.round(n * 10) / 10;

export function attendancePct(present: number, absent: number): number | null {
  const marked = present + absent; // excused doesn't count either way
  return marked === 0 ? null : round1((present / marked) * 100);
}

export function averagePct(points: { scorePct: number }[]): number | null {
  return points.length === 0 ? null : round1(points.reduce((s, p) => s + p.scorePct, 0) / points.length);
}

export function trendOf(points: ScorePoint[]): ScorePoint[] {
  return [...points].sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
}

export function categoryAverages(points: ScorePoint[]): CategoryAverage[] {
  const by = new Map<CategoryAverage["category"], number[]>();
  for (const p of points) by.set(p.category, [...(by.get(p.category) ?? []), p.scorePct]);
  return [...by.entries()]
    .map(([category, list]) => ({ category, avgPct: round1(list.reduce((s, v) => s + v, 0) / list.length), count: list.length }))
    .sort((a, b) => b.avgPct - a.avgPct);
}

// Strength / weak area only when there are 2+ categories to compare.
export function strengthAndWeakArea(categories: CategoryAverage[]): { strength: CategoryAverage | null; weakArea: CategoryAverage | null } {
  if (categories.length < 2) return { strength: null, weakArea: null };
  const sorted = [...categories].sort((a, b) => b.avgPct - a.avgPct);
  return { strength: sorted[0], weakArea: sorted[sorted.length - 1] };
}

export function summarize(row: { reviewedCount: number; sessionsPresent: number; sessionsAbsent: number; contentCompleted: number; lastSubmissionAt: string | null }, points: ScorePoint[]): ProgressSummary {
  return {
    reviewedCount: row.reviewedCount,
    avgScorePct: averagePct(points),
    sessionsPresent: row.sessionsPresent,
    sessionsAbsent: row.sessionsAbsent,
    attendancePct: attendancePct(row.sessionsPresent, row.sessionsAbsent),
    contentCompleted: row.contentCompleted,
    lastSubmissionAt: row.lastSubmissionAt,
  };
}

const LOW_SCORE = 50;
const QUIET_DAYS = 14;

// A signal with its reason, never a judgement (specs.md §8.2).
export function attentionReason(
  s: { avgScorePct: number | null; reviewedCount: number; lastSubmissionAt: string | null; attendancePct: number | null },
  ctx: { nowIso: string; batchHadOpenAssessment: boolean },
): string | null {
  if (s.avgScorePct !== null && s.reviewedCount >= 1 && s.avgScorePct < LOW_SCORE) return `Average score ${s.avgScorePct}% (below ${LOW_SCORE}%)`;
  if (ctx.batchHadOpenAssessment) {
    const quietSince = Date.parse(ctx.nowIso) - QUIET_DAYS * 86_400_000;
    if (!s.lastSubmissionAt) return "No assessment submitted yet while assessments are open";
    if (Date.parse(s.lastSubmissionAt) < quietSince) return `No submission in ${QUIET_DAYS} days while assessments are open`;
  }
  if (s.attendancePct !== null && s.attendancePct < 50) return `Attendance ${s.attendancePct}% of marked sessions`;
  return null;
}

export function sortAttention(list: AttentionStudent[]): AttentionStudent[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}
