import { Clock, Info, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AiConfidence, AiEvaluation, AiFeedbackState, AiRating } from "@/types/ai";
import type { DashboardTone } from "@/types/academy";

// One way to show an AI practice evaluation everywhere (student and mentor).
// Always labelled as an AI practice evaluation, never an SSB result, and
// ratings are words with a dot — never a score or a percentage.

const RATING: Record<AiRating, { label: string; tone: DashboardTone }> = {
  strong: { label: "Strong", tone: "success" },
  developing: { label: "Developing", tone: "info" },
  needs_attention: { label: "Needs attention", tone: "warning" },
};
const CONFIDENCE: Record<AiConfidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence — based on little evidence" };

function Notice() {
  return (
    <p className="flex items-start gap-2 rounded-control border border-hairline bg-white px-4 py-3 text-[13px] text-ink-secondary">
      <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      <span>
        <strong className="text-ink">AI-generated practice evaluation.</strong> It describes patterns in these practice answers to help you prepare. It is not an SSB assessment and says nothing about selection.
      </span>
    </p>
  );
}

function Evaluation({ e, audience }: { e: AiEvaluation; audience: "student" | "mentor" }) {
  const steps: [string, string][] = [
    ["What we noticed", e.feedback.observation],
    ["Where it shows", e.feedback.evidence],
    ["Why it matters", e.feedback.impact],
    [audience === "student" ? "One thing to change" : "Suggested change", e.feedback.improvementAction],
    ["Practise next", e.feedback.recommendedPractice],
  ];
  return (
    <div className="flex flex-col gap-6">
      <Notice />
      <section aria-labelledby="ai-feedback-heading" className="glass-regular flex flex-col gap-4 rounded-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ai-feedback-heading" className="flex items-center gap-2 text-[18px] font-semibold text-ink">
            <Sparkles aria-hidden="true" size={18} className="text-brand-accent" />
            Feedback
          </h2>
          <span className="text-[12px] text-ink-secondary">{CONFIDENCE[e.overallConfidence]}</span>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map(([title, text]) => (
            <li key={title}>
              <p className="text-[12px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{title}</p>
              <p className="text-sm text-ink">{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="ai-patterns-heading" className="flex flex-col gap-3">
        <h2 id="ai-patterns-heading" className="text-[18px] font-semibold text-ink">Observed practice patterns</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {e.dimensions.map((d) => (
            <li key={d.id} className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{d.name}</span>
                <StatusBadge label={RATING[d.rating].label} tone={RATING[d.rating].tone} />
              </div>
              <p className="text-[13px] text-ink">{d.note}</p>
              {d.evidence.length > 0 && (
                <ul className="flex flex-col gap-1 border-l-2 border-hairline pl-3">
                  {d.evidence.map((q) => (
                    <li key={q} className="text-[13px] text-ink-secondary italic">“{q}”</li>
                  ))}
                </ul>
              )}
              <span className="text-[12px] text-ink-secondary">{CONFIDENCE[d.confidence]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function AiFeedbackView({ state, audience = "student" }: { state: AiFeedbackState; audience?: "student" | "mentor" }) {
  switch (state.status) {
    case "ready":
      return <Evaluation e={state.evaluation} audience={audience} />;
    case "pending":
      return (
        <div className="glass-regular rounded-card" role="status">
          <EmptyState icon={<Clock aria-hidden="true" size={22} />} title="Feedback is being prepared" description={audience === "student" ? "Your answers are saved. This usually takes a minute; you'll get a notification when it's ready." : "The student's answers are saved; AI feedback is on its way."} />
        </div>
      );
    case "unavailable":
      return (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<Info aria-hidden="true" size={22} />} title="AI feedback isn't available for this attempt" description={audience === "student" ? "Your answers are saved and your mentor can still review them." : "The answers are saved; review them yourself below."} />
        </div>
      );
    default:
      return (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<Info aria-hidden="true" size={22} />} title="No feedback for this attempt" description="Nothing was written, so there was nothing to evaluate." />
        </div>
      );
  }
}
