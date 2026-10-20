import { LineChart as LineChartIcon } from "lucide-react";
import { ScoreTrendChart } from "@/components/progress/score-trend-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatIstDay } from "@/lib/server/sessions/validation";
import { CONTENT_CATEGORIES } from "@/types/content";
import type { CategoryAverage, ProgressSummary, ScorePoint, StudentProgress } from "@/types/progress";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export function ProgressStats({ summary }: { summary: ProgressSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="performance" label="Average score" value={pct(summary.avgScorePct)} />
      <StatCard icon="evaluations" label="Reviewed" value={summary.reviewedCount} />
      <StatCard icon="sessions" label="Attendance" value={pct(summary.attendancePct)} />
      <StatCard icon="content" label="Library read" value={summary.contentCompleted} />
    </div>
  );
}

// Single-hue bars; the value is always printed as text beside the bar.
export function CategoryBars({ categories }: { categories: CategoryAverage[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {categories.map((c) => (
        <li key={c.category} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_48px] items-center gap-3 text-[13px]">
          <span className="truncate text-ink">{CONTENT_CATEGORIES[c.category]}</span>
          <span className="h-2 overflow-hidden rounded-full bg-[var(--hairline)]" aria-hidden="true">
            <span className="block h-full rounded-full bg-[var(--academy-chart-overall)]" style={{ width: `${Math.max(c.avgPct, 2)}%` }} />
          </span>
          <span className="text-right text-ink">{c.avgPct}%</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreTable({ points }: { points: ScorePoint[] }) {
  return (
    <details className="mt-3 text-[13px]">
      <summary className="cursor-pointer text-ink-secondary">View as table</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
            <th className="py-1 pr-3 font-semibold">Assessment</th>
            <th className="py-1 pr-3 font-semibold">Reviewed</th>
            <th className="py-1 text-right font-semibold">Score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.assessmentId} className="border-t border-hairline">
              <td className="py-1.5 pr-3 text-ink">{p.title}</td>
              <td className="py-1.5 pr-3 text-ink-secondary">{formatIstDay(p.reviewedAt)}</td>
              <td className="py-1.5 text-right text-ink">{p.score}/{p.maxScore} ({p.scorePct}%)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// Shared body for the student's own page and the mentor's mentee page.
export function ProgressBody({ progress, emptyHint }: { progress: StudentProgress; emptyHint: string }) {
  const { trend, categories, strength, weakArea, recentFeedback } = progress;
  if (trend.length === 0) {
    return (
      <div className="glass-regular rounded-card">
        <EmptyState icon={<LineChartIcon aria-hidden="true" size={22} />} title="No reviewed scores yet" description={emptyHint} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="glass-regular rounded-card p-6 lg:col-span-2">
        <h2 className="text-[18px] font-semibold text-ink">Score trend</h2>
        <p className="mb-3 text-[13px] text-ink-secondary">Each point is one mentor-reviewed assessment.</p>
        <ScoreTrendChart points={trend} />
        <ScoreTable points={trend} />
      </section>
      <section className="glass-regular rounded-card p-6">
        <h2 className="mb-1 text-[18px] font-semibold text-ink">By area</h2>
        <p className="mb-4 text-[13px] text-ink-secondary">
          {strength && weakArea ? `Strongest: ${CONTENT_CATEGORIES[strength.category]} · Needs work: ${CONTENT_CATEGORIES[weakArea.category]}` : "Strengths and weak areas appear once two areas are reviewed."}
        </p>
        <CategoryBars categories={categories} />
      </section>
      <section className="glass-regular rounded-card p-6">
        <h2 className="mb-3 text-[18px] font-semibold text-ink">Recent mentor feedback</h2>
        {recentFeedback.length === 0 ? (
          <p className="text-[13px] text-ink-secondary">No written feedback yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {recentFeedback.map((f) => (
              <li key={f.assessmentId} className="text-[13px]">
                <p className="font-semibold text-ink">{f.title}</p>
                {f.strengths && <p className="text-ink-secondary"><span className="text-ink">Strengths:</span> {f.strengths}</p>}
                {f.improvementAreas && <p className="text-ink-secondary"><span className="text-ink">Work on:</span> {f.improvementAreas}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
