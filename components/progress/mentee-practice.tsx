import { EmptyState } from "@/components/ui/empty-state";
import { formatIstDay } from "@/lib/server/sessions/validation";
import type { MenteePracticeAnswer, MenteePracticeAttempt } from "@/types/practice";

// A mentee's own practice, as their mentor sees it (0014: mentors of the
// student's batch can read answers). Preparation work, not an evaluation.
export function MenteePractice({ answers, attempts }: { answers: MenteePracticeAnswer[]; attempts: MenteePracticeAttempt[] }) {
  if (answers.length === 0 && attempts.length === 0) {
    return (
      <div className="glass-regular rounded-card">
        <EmptyState title="No practice yet" description="Answers and tests from the student's Practice journey appear here." />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="glass-regular rounded-card p-6">
        <h3 className="mb-3 text-[16px] font-semibold text-ink">Latest written answers</h3>
        {answers.length === 0 ? (
          <p className="text-[13px] text-ink-secondary">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {answers.map((a, i) => (
              <li key={`${a.updatedAt}-${i}`} className="text-[13px]">
                <p className="text-ink-secondary">
                  {a.bankTitle} · {formatIstDay(a.updatedAt)}
                  {a.done ? " · marked done" : ""}
                </p>
                <p className="font-semibold text-ink">{a.prompt}</p>
                <p className="whitespace-pre-wrap text-ink">{a.answer}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="glass-regular rounded-card p-6">
        <h3 className="mb-3 text-[16px] font-semibold text-ink">Tests and mock runs</h3>
        {attempts.length === 0 ? (
          <p className="text-[13px] text-ink-secondary">None yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {attempts.map((t) => (
              <li key={t.id} className="flex min-h-11 items-center justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{t.bankTitle}</span>
                  <span className="block text-ink-secondary">
                    {t.mode === "mock" ? "Mock run" : "Timed test"} · {formatIstDay(t.submittedAt)}
                  </span>
                </span>
                <span className="shrink-0 text-ink">{t.correct !== null ? `${t.correct} / ${t.total} correct` : `${t.total} answered`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
