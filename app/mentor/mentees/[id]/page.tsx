import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { DetailHeader } from "@/components/ui/detail-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyMentee } from "@/lib/server/academy-people/service";
import { EvaluationStatusTag } from "@/components/assessments/assessment-tags";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { getMenteeHistory } from "@/lib/server/assessments/service";
import { evaluationStatusOf } from "@/types/assessments";
import { formatDay } from "@/lib/utils/format-date";
import { ProgressBody, ProgressStats } from "@/components/progress/progress-views";
import { getMenteeProgress } from "@/lib/server/progress/service";
import { MenteePractice } from "@/components/progress/mentee-practice";
import { getMenteePractice } from "@/lib/server/practice/service";

export const metadata: Metadata = { title: "Mentee" };

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

// Only a student in one of this mentor's batches. Any other id — another
// batch, another academy, or nonexistent — is the same "not found" (specs §7.4).
export default async function MenteeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, history, progress, practice] = await Promise.all([getMyMentee(id), getMenteeHistory(id), getMenteeProgress(id), getMenteePractice(id)]);
  if (!result.ok && result.error?.code === "not_found") notFound();

  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/mentor/mentees" className="text-[13px] text-ink-secondary no-underline">‹ Mentees</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this student. Please try again."} />
      </div>
    );
  }

  const { student, mentors } = result.data;
  const name = student.fullName || student.email || "Unnamed student";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/mentees" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Mentees
      </Link>
      <h1 className="sr-only">{name}</h1>
      <DetailHeader name={name} subtitle={student.email ?? "No email on file"} />

      <section aria-label="Mentee details" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard label="Batch">{student.batchName ?? "—"}</InfoCard>
        <InfoCard label="Mentors on this batch">{mentors.map((m) => m.name).join(", ") || "—"}</InfoCard>
        <InfoCard label="Last login">{formatDay(student.lastLoginAt) ?? <span className="text-ink-secondary">Never</span>}</InfoCard>
      </section>

      <section aria-labelledby="progress-heading" className="flex flex-col gap-4">
        <h2 id="progress-heading" className="text-[18px] font-semibold text-ink">Progress</h2>
        {progress.ok && progress.data ? (
          <>
            <ProgressStats summary={progress.data.summary} />
            <ProgressBody progress={progress.data} emptyHint="Their trend starts once you review a submitted assessment." />
          </>
        ) : (
          <RetryErrorState message={progress.error?.message ?? "We couldn't load this student's progress. Please try again."} />
        )}
      </section>

      <section aria-labelledby="practice-heading" className="flex flex-col gap-3">
        <h2 id="practice-heading" className="text-[18px] font-semibold text-ink">Practice</h2>
        {practice.ok && practice.data ? (
          <MenteePractice answers={practice.data.answers} attempts={practice.data.attempts} />
        ) : (
          <RetryErrorState message={practice.error?.message ?? "We couldn't load this student's practice. Please try again."} />
        )}
      </section>

      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <h2 id="activity-heading" className="text-[18px] font-semibold text-ink">Assessments and evaluations</h2>
        {(history.data ?? []).length === 0 ? (
          <div className="glass-regular rounded-card">
            <EmptyState title="No submissions yet" description="Assessments this student submits in your batches appear here." />
          </div>
        ) : (
          <ListPanel>
            {history.data!.map((t) => (
              <ListRow key={t.id} href={`/mentor/evaluations/${t.id}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{t.assessmentTitle}</p>
                  <p className="text-[13px] text-ink-secondary">{t.feedback?.status === "reviewed" && t.feedback.score !== null ? `Score ${t.feedback.score} / ${t.maxScore}` : "Not reviewed yet"}</p>
                </div>
                <EvaluationStatusTag status={evaluationStatusOf(t) ?? "pending"} />
              </ListRow>
            ))}
          </ListPanel>
        )}
      </section>
    </div>
  );
}
