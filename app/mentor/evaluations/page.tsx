import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { cn } from "cn";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { EvaluationStatusTag } from "@/components/assessments/assessment-tags";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getReviewQueue } from "@/lib/server/assessments/service";
import { formatIstDay } from "@/lib/server/sessions/validation";
import { evaluationStatusOf, EVALUATION_STATUSES, type EvaluationStatus } from "@/types/assessments";

export const metadata: Metadata = { title: "Evaluations" };

const TABS: EvaluationStatus[] = ["pending", "in_review", "reviewed"];

// Submissions from batches this mentor teaches (RLS), by evaluation status.
export default async function EvaluationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const raw = (await searchParams).status;
  const active: EvaluationStatus = TABS.includes(raw as EvaluationStatus) ? (raw as EvaluationStatus) : "pending";
  const result = await getReviewQueue();
  const rows = (result.data ?? []).filter((t) => evaluationStatusOf(t) === active);
  const counts = Object.fromEntries(TABS.map((s) => [s, (result.data ?? []).filter((t) => evaluationStatusOf(t) === s).length]));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Evaluations" subtitle="Review your batches' submitted assessments." />
      <nav aria-label="Evaluation status" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((s) => (
          <Link key={s} href={s === "pending" ? "/mentor/evaluations" : `/mentor/evaluations?status=${s}`} aria-current={s === active ? "page" : undefined}
            className={cn("inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-[13px] no-underline", s === active ? "border-brand-accent text-brand-accent" : "border-hairline text-ink-secondary hover:text-ink")}>
            {EVALUATION_STATUSES[s]} <span className="ml-1.5 text-ink-secondary">({counts[s]})</span>
          </Link>
        ))}
      </nav>
      {!result.ok ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load submissions. Please try again."} />
      ) : rows.length === 0 ? (
        <div className="glass-regular rounded-card"><EmptyState icon={<Inbox aria-hidden="true" size={22} />} title={active === "pending" ? "Nothing waiting for review" : "Nothing here"} description={active === "pending" ? "Submissions from your batches appear here." : "Evaluations in this state appear here."} /></div>
      ) : (
        <ListPanel>
          {rows.map((t) => (
            <ListRow key={t.id} href={`/mentor/evaluations/${t.id}`}>
              <div className="min-w-0"><p className="truncate text-sm text-ink">{t.studentName ?? "Student"} — {t.assessmentTitle}</p><p className="text-[13px] text-ink-secondary">{t.batchName ?? "Batch"} · submitted {t.submittedAt ? formatIstDay(t.submittedAt) : ""}</p></div>
              <EvaluationStatusTag status={evaluationStatusOf(t) ?? "pending"} />
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
