import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Inbox } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AssessmentStatusTag, EvaluationStatusTag } from "@/components/assessments/assessment-tags";
import { CategoryTag } from "@/components/content/content-tags";
import { AssessmentForm } from "@/components/mentor/assessments/assessment-form";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { changeAssessmentStatusAction } from "@/lib/actions/assessments";
import { getActor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import { getMentorAssessment } from "@/lib/server/assessments/service";
import { formatIstDay, utcIsoToIst } from "@/lib/server/sessions/validation";
import { evaluationStatusOf } from "@/types/assessments";

export const metadata: Metadata = { title: "Assessment" };

export default async function MentorAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMentorAssessment(id);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) return <RetryErrorState message={result.error?.message ?? "We couldn't load this assessment. Please try again."} />;
  const { assessment: a, attempts } = result.data;
  const actor = await getActor();
  const batches = actor ? await findMyBatchIds(actor.id) : { data: [] };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/assessments" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"><ChevronLeft aria-hidden="true" size={16} />Assessments</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-ink">{a.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-secondary">
            <AssessmentStatusTag status={a.status} />
            <CategoryTag category={a.category} />
            <span>{a.batchName}</span>
            <span>· {a.questions.length} questions · out of {a.maxScore}</span>
            {a.dueAt && <span>· due {formatIstDay(a.dueAt)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {a.status === "draft" && <ConfirmActionDialog triggerLabel="Open for answers" title="Open this assessment?" description="Students in the batch can answer it. Questions can't be changed afterwards." confirmLabel="Open for answers" action={changeAssessmentStatusAction.bind(null, a.id, "published")} />}
          {a.status === "published" && <ConfirmActionDialog triggerLabel="Close" title="Close this assessment?" description="No new answers are accepted. You can still review submissions, and reopen it." confirmLabel="Close" destructive action={changeAssessmentStatusAction.bind(null, a.id, "closed")} />}
          {a.status === "closed" && <ConfirmActionDialog triggerLabel="Reopen" title="Reopen this assessment?" description="Students who haven't submitted can answer again until it's closed or due." confirmLabel="Reopen" action={changeAssessmentStatusAction.bind(null, a.id, "published")} />}
        </div>
      </div>

      {a.status === "draft" ? (
        <AssessmentForm
          batches={batches.data ?? []}
          assessmentId={a.id}
          initial={{ batchId: a.batchId, title: a.title, instructions: a.instructions ?? "", category: a.category, questions: a.questions.map((q) => q.prompt), maxScore: String(a.maxScore), dueDate: a.dueAt ? utcIsoToIst(a.dueAt).date : "" }}
        />
      ) : (
        <section aria-labelledby="q-heading" className="glass-regular flex flex-col gap-3 rounded-card px-6 py-5">
          <h2 id="q-heading" className="text-[18px] font-bold text-ink">Questions</h2>
          {a.instructions && <p className="text-[14px] whitespace-pre-wrap text-ink-secondary">{a.instructions}</p>}
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] text-ink">{a.questions.map((q) => <li key={q.id}>{q.prompt}</li>)}</ol>
        </section>
      )}

      <section aria-labelledby="subs-heading" className="flex flex-col gap-3">
        <h2 id="subs-heading" className="text-[18px] font-bold text-ink">Submissions</h2>
        {attempts.length === 0 ? (
          <div className="glass-regular rounded-card"><EmptyState icon={<Inbox aria-hidden="true" size={22} />} title="No submissions yet" description={a.status === "draft" ? "Open the assessment so students can answer." : "Submitted answers appear here for review."} /></div>
        ) : (
          <ListPanel>
            {attempts.map((t) => (
              <ListRow key={t.id} href={`/mentor/evaluations/${t.id}`}>
                <div className="min-w-0"><p className="truncate text-sm text-ink">{t.studentName ?? "Student"}</p><p className="text-[13px] text-ink-secondary">Submitted {t.submittedAt ? formatIstDay(t.submittedAt) : ""}</p></div>
                <EvaluationStatusTag status={evaluationStatusOf(t) ?? "pending"} />
              </ListRow>
            ))}
          </ListPanel>
        )}
      </section>
    </div>
  );
}
