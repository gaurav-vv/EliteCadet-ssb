import type { DiagnosticOverview, DiagnosticSummary } from "@/types/diagnostic";
import { formatIstDay } from "@/lib/server/sessions/validation";

const RATING = { strong: "Strong", developing: "Developing", needs_attention: "Needs attention" } as const;
const WRITTEN: [string, string][] = [
  ["communication", "Communication"],
  ["situational_reasoning", "Situational reasoning"],
  ["self_awareness", "Self-awareness"],
];

function cell(s: DiagnosticSummary | null, key: string) {
  if (!s) return <span className="text-ink-secondary">—</span>;
  if (key === "knowledge" || key === "reasoning") {
    const v = s[key];
    return `${v.correct} of ${v.total}`;
  }
  const r = s.written[key];
  return r ? RATING[r] : <span className="text-ink-secondary">Feedback pending</span>;
}

// Starting point vs latest, side by side — the baseline never changes, so
// this comparison stays honest (PRD §9.3).
export function DiagnosticComparison({ overview }: { overview: DiagnosticOverview }) {
  const { baseline, latest } = overview;
  if (!baseline) return null;
  const rows: [string, string][] = [["knowledge", "SSB knowledge"], ["reasoning", "Reasoning"], ...WRITTEN];
  return (
    <section aria-labelledby="diag-compare" className="glass-regular flex flex-col gap-3 rounded-card p-6">
      <h2 id="diag-compare" className="text-[18px] font-semibold text-ink">
        {latest ? "Starting point and now" : "Your starting point"}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-[0.04em] text-ink-secondary uppercase">
              <th scope="col" className="py-2 pr-4 font-semibold">Area</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Starting point · {formatIstDay(baseline.submittedAt)}</th>
              {latest && <th scope="col" className="py-2 font-semibold">Latest · {formatIstDay(latest.submittedAt)}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map(([key, label]) => (
              <tr key={key}>
                <th scope="row" className="py-2.5 pr-4 font-normal text-ink">{label}</th>
                <td className="py-2.5 pr-4 text-ink">{cell(baseline, key)}</td>
                {latest && <td className="py-2.5 text-ink">{cell(latest, key)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-ink-secondary">A starting point for your plan, not a grade. Your first attempt is kept as it is so you can always compare.</p>
    </section>
  );
}
