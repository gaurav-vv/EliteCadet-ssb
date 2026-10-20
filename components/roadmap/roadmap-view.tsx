import Link from "next/link";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { TodayMission } from "@/components/roadmap/today-mission";
import type { Roadmap, RoadmapStageId } from "@/types/roadmap";

const ORDER: RoadmapStageId[] = ["exploration", "foundation", "core_preparation", "advanced_practice", "mock_readiness", "final_revision"];
const LABEL: Record<RoadmapStageId, string> = { exploration: "Exploration", foundation: "Foundation", core_preparation: "Core preparation", advanced_practice: "Advanced practice", mock_readiness: "Mock readiness", final_revision: "Final revision" };
const STATE = { strong: ["Strong", "success"], improving: ["Improving", "info"], developing: ["Developing", "neutral"], needs_attention: ["Needs attention", "warning"], not_enough_evidence: ["No evidence yet", "neutral"] } as const;

export function RoadmapView({ roadmap }: { roadmap: Roadmap }) {
  const at = ORDER.indexOf(roadmap.stage.id);
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="stage-heading" className="glass-regular flex flex-col gap-4 rounded-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Suggested stage</p>
            <h2 id="stage-heading" className="text-[22px] font-bold text-ink">
              {roadmap.stage.label}
            </h2>
            <p className="text-sm text-ink-secondary">{roadmap.stage.explanation}</p>
          </div>
          <div className="text-right text-[13px] text-ink-secondary">
            {roadmap.selfReportedStage && <p>You said: {roadmap.selfReportedStage}</p>}
            {roadmap.daysToTarget !== null && roadmap.daysToTarget >= 0 && <p>{roadmap.daysToTarget === 0 ? "Your SSB date is today" : `${roadmap.daysToTarget} days to your SSB date`}</p>}
          </div>
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Preparation stages">
          {ORDER.map((id, i) => (
            <li key={id} aria-current={i === at ? "step" : undefined} className={i === at ? "rounded-pill border border-brand-accent px-3 py-1 text-[12px] text-brand-accent" : i < at ? "rounded-pill border border-hairline px-3 py-1 text-[12px] text-ink" : "rounded-pill border border-hairline px-3 py-1 text-[12px] text-ink-secondary"}>
              {i < at ? "✓ " : ""}
              {LABEL[id]}
            </li>
          ))}
        </ol>
        <p className="text-[12px] text-ink-secondary">The stage is a suggestion from your evidence; you decide how to prepare. It says nothing about selection.</p>
      </section>

      <TodayMission actions={roadmap.today} title="Today" showLink={false} />

      {roadmap.focus.length > 0 && (
        <section aria-labelledby="focus-heading" className="flex flex-col gap-3">
          <h2 id="focus-heading" className="text-[18px] font-semibold text-ink">
            This week&apos;s focus
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {roadmap.focus.map((f) => (
              <li key={f.dimension} className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{f.name}</span>
                  <StatusBadge label={STATE[f.state][0]} tone={STATE[f.state][1]} />
                </div>
                <p className="text-[13px] text-ink-secondary">{f.why}</p>
                <Link href={f.action.href} className="mt-auto inline-flex min-h-11 items-center text-[13px] text-brand-accent hover:underline">
                  {f.action.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {roadmap.weekPlan.length > 0 && (
        <section aria-labelledby="time-heading" className="glass-regular flex flex-col gap-3 rounded-card p-6">
          <h2 id="time-heading" className="text-[18px] font-semibold text-ink">
            How to use your daily time
          </h2>
          <ul className="flex flex-col divide-y divide-hairline">
            {roadmap.weekPlan.map((w) => (
              <li key={w.label} className="flex min-h-11 items-center justify-between text-sm">
                <span className="text-ink">{w.label}</span>
                <span className="text-ink">{w.minutes} min</span>
              </li>
            ))}
          </ul>
          <Link href="/student/profile" className="text-[13px] text-brand-accent hover:underline">
            Change your daily time
          </Link>
        </section>
      )}

      {roadmap.basedOn.length > 0 && <p className="text-[12px] text-ink-secondary">Built from {roadmap.basedOn.join(", ")}. It updates whenever new evidence arrives.</p>}
    </div>
  );
}
