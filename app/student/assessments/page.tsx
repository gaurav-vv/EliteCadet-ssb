import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AssessmentStatusTag, EvaluationStatusTag } from "@/components/assessments/assessment-tags";
import { CategoryTag } from "@/components/content/content-tags";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getStudentAssessments } from "@/lib/server/assessments/service";
import { formatIstDay } from "@/lib/server/sessions/validation";
import { evaluationStatusOf } from "@/types/assessments";

export const metadata: Metadata = { title: "Assessments" };

export default async function StudentAssessmentsPage() {
  const result = await getStudentAssessments();
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Assessments" subtitle="Written assessments from your mentors, and their feedback." />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your assessments. Please try again."} />
      ) : result.data.length === 0 ? (
        <div className="glass-regular rounded-card"><EmptyState icon={<ClipboardCheck aria-hidden="true" size={22} />} title="No assessments yet" description="When your mentor opens one for your batch, it appears here." /></div>
      ) : (
        <ListPanel>
          {result.data.map((a) => {
            const ev = a.attempt ? evaluationStatusOf(a.attempt) : null;
            return (
              <ListRow key={a.id} href={`/student/assessments/${a.id}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{a.title}</p>
                  <p className="text-[13px] text-ink-secondary">{a.mentorName ? `${a.mentorName} · ` : ""}{a.questions.length} questions{a.dueAt ? ` · due ${formatIstDay(a.dueAt)}` : ""}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                  <CategoryTag category={a.category} />
                  {ev ? <EvaluationStatusTag status={ev} /> : a.attempt ? <span className="text-[13px] text-ink">Draft saved</span> : <AssessmentStatusTag status={a.status} />}
                </div>
              </ListRow>
            );
          })}
        </ListPanel>
      )}
    </div>
  );
}
