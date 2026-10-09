import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { EvaluationStatusTag } from "@/components/assessments/assessment-tags";
import { FeedbackView } from "@/components/assessments/feedback-view";
import { FeedbackForm } from "@/components/mentor/assessments/feedback-form";
import { getAttemptForReview } from "@/lib/server/assessments/service";
import { formatIstDay } from "@/lib/server/sessions/validation";
import { evaluationStatusOf } from "@/types/assessments";

export const metadata: Metadata = { title: "Evaluate" };

// A submitted attempt in a batch this mentor teaches; anything else is "not found".
export default async function EvaluatePage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const result = await getAttemptForReview(attemptId);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) return <RetryErrorState message={result.error?.message ?? "We couldn't load this submission. Please try again."} />;
  const { assessment: a, attempt: t } = result.data;
  const f = t.feedback;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/evaluations" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"><ChevronLeft aria-hidden="true" size={16} />Evaluations</Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold text-ink">{t.studentName ?? "Student"}</h1>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-secondary">
          <EvaluationStatusTag status={evaluationStatusOf(t) ?? "pending"} />
          <span>{a.title} · {a.batchName}</span>
          {t.submittedAt && <span>· submitted {formatIstDay(t.submittedAt)}</span>}
        </div>
      </div>
      <section aria-labelledby="answers-heading" className="flex flex-col gap-3">
        <h2 id="answers-heading" className="text-[18px] font-bold text-ink">Answers</h2>
        {a.questions.map((q, i) => (
          <div key={q.id} className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
            <p className="text-[15px] font-medium text-ink">{i + 1}. {q.prompt}</p>
            <p className="text-[15px] whitespace-pre-wrap text-ink">{t.answers.find((x) => x.questionId === q.id)?.answer || <span className="text-ink-secondary">No answer</span>}</p>
          </div>
        ))}
      </section>
      {f?.status === "reviewed" ? (
        <FeedbackView feedback={f} maxScore={a.maxScore} />
      ) : (
        <FeedbackForm attemptId={t.id} maxScore={a.maxScore} initial={{ score: f?.score !== null && f?.score !== undefined ? String(f.score) : "", strengths: f?.strengths ?? "", improvementAreas: f?.improvementAreas ?? "", comments: f?.comments ?? "" }} />
      )}
    </div>
  );
}
