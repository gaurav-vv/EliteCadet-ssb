import Link from "next/link";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import type { DashboardTone } from "@/types/academy";
import type { ReadinessConfidence, ReadinessProfile, ReadinessState } from "@/types/readiness";

// The readiness profile (PRD §11.8): a state per dimension with its evidence —
// deliberately never one number, and never an SSB result.

const STATE: Record<ReadinessState, { label: string; tone: DashboardTone }> = {
  strong: { label: "Strong", tone: "success" },
  improving: { label: "Improving", tone: "info" },
  developing: { label: "Developing", tone: "neutral" },
  needs_attention: { label: "Needs attention", tone: "warning" },
  not_enough_evidence: { label: "Not enough evidence yet", tone: "neutral" },
};
const CONFIDENCE: Record<ReadinessConfidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export function ReadinessProfileView({ profile, title = "Readiness profile" }: { profile: ReadinessProfile; title?: string }) {
  return (
    <section aria-labelledby="readiness-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="readiness-heading" className="text-[18px] font-semibold text-ink">
          {title}
        </h2>
        <p className="text-[13px] text-ink-secondary">Seven areas, each from real evidence: mentor reviews, AI practice feedback, practice and attendance. It is a preparation guide, not a score or an SSB result.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {profile.dimensions.map((d) => (
          <li key={d.id} className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{d.name}</span>
              <StatusBadge label={STATE[d.state].label} tone={STATE[d.state].tone} />
            </div>
            {d.state !== "not_enough_evidence" && <span className="text-[12px] text-ink-secondary">{CONFIDENCE[d.confidence]}</span>}
            {d.evidence.length > 0 && (
              <ul className="flex flex-col gap-1 text-[13px] text-ink-secondary">
                {d.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {d.next && <p className="text-[13px] text-ink">Next: {d.next}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReadinessStrip({ profile }: { profile: ReadinessProfile }) {
  return (
    <section aria-labelledby="readiness-strip" className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id="readiness-strip" className="text-[18px] font-semibold text-ink">
          Readiness profile
        </h2>
        <Link href="/student/progress" className="text-[13px] text-brand-accent hover:underline">
          See the evidence
        </Link>
      </div>
      <ul className="glass-regular flex flex-wrap gap-x-6 gap-y-3 rounded-card px-5 py-4">
        {profile.dimensions.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-[13px] text-ink">
            {d.name}
            <StatusBadge label={STATE[d.state].label} tone={STATE[d.state].tone} />
          </li>
        ))}
      </ul>
    </section>
  );
}
