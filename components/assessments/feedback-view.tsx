import { formatIstDay } from "@/lib/server/sessions/validation";
import type { FeedbackRecord } from "@/types/assessments";

// Reviewed mentor feedback, with evaluator and date (specs.md §7.5). This is
// the mentor's guidance on preparation, never an SSB selection outcome.
export function FeedbackView({ feedback, maxScore }: { feedback: FeedbackRecord; maxScore: number }) {
  const block = (label: string, value: string | null) =>
    value ? (
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
        <p className="text-[15px] whitespace-pre-wrap text-ink">{value}</p>
      </div>
    ) : null;
  return (
    <section aria-label="Mentor feedback" className="glass-regular flex flex-col gap-4 rounded-card px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold text-ink">Mentor feedback</h2>
        <p className="text-[13px] text-ink-secondary">
          {feedback.mentorName ?? "Your mentor"}
          {feedback.reviewedAt ? ` · ${formatIstDay(feedback.reviewedAt)}` : ""}
        </p>
      </div>
      {feedback.score !== null && (
        <p className="text-ink">
          <span className="text-[28px] font-bold">{feedback.score}</span>
          <span className="text-ink-secondary"> / {maxScore}</span>
        </p>
      )}
      {block("Strengths", feedback.strengths)}
      {block("Areas to improve", feedback.improvementAreas)}
      {block("Comments", feedback.comments)}
      <p className="text-[12px] text-ink-secondary">Feedback from your mentor to guide your preparation. It isn&apos;t an SSB result.</p>
    </section>
  );
}
