import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AssessmentStatusTag, EvaluationStatusTag } from "@/components/assessments/assessment-tags";
import { FeedbackView } from "@/components/assessments/feedback-view";
import { AttemptForm } from "@/components/student/assessments/attempt-form";
import { getStudentAssessment } from "@/lib/server/assessments/service";
import { formatIstDay } from "@/lib/server/sessions/validation";
import { evaluationStatusOf } from "@/types/assessments";

export const metadata: Metadata = { title: "Assessment" };

export default async function StudentAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getStudentAssessment(id, new Date().toISOString());
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) return <RetryErrorState message={result.error?.message ?? "We couldn't load this assessment. Please try again."} />;
  const { assessment: a, attempt: t, open } = result.data;
  const ev = t ? evaluationStatusOf(t) : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/student/assessments" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"><ChevronLeft aria-hidden="true" size={16} />Assessments</Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold text-ink">{a.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-secondary">
          {ev ? <EvaluationStatusTag status={ev} /> : <AssessmentStatusTag status={a.status} />}
          <span>{a.questions.length} questions · out of {a.maxScore}</span>
          {a.dueAt && <span>· due {formatIstDay(a.dueAt)}</span>}
        </div>
        {a.instructions && <p className="text-[15px] whitespace-pre-wrap text-ink-secondary">{a.instructions}</p>}
      </div>
      {t?.status === "submitted" ? (
        <>
          <section aria-labelledby="mine-heading" className="flex flex-col gap-3">
            <h2 id="mine-heading" className="text-[18px] font-bold text-ink">Your answers</h2>
            {a.questions.map((q, i) => (
              <div key={q.id} className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
                <p className="text-[15px] font-medium text-ink">{i + 1}. {q.prompt}</p>
                <p className="text-[15px] whitespace-pre-wrap text-ink">{t.answers.find((x) => x.questionId === q.id)?.answer || <span className="text-ink-secondary">No answer</span>}</p>
              </div>
            ))}
          </section>
          {t.feedback?.status === "reviewed" ? <FeedbackView feedback={t.feedback} maxScore={a.maxScore} /> : <p className="glass-regular rounded-card px-6 py-5 text-sm text-ink-secondary">Submitted. Your mentor&apos;s feedback will appear here once they&apos;ve reviewed it.</p>}
        </>
      ) : open ? (
        <AttemptForm assessmentId={a.id} questions={a.questions} initial={t?.answers ?? []} />
      ) : (
        <p className="glass-regular rounded-card px-6 py-5 text-sm text-ink-secondary">This assessment isn&apos;t open for answers{a.dueAt ? " — its due date has passed" : ""}.</p>
      )}
    </div>
  );
}
