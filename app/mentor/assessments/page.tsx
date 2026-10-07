import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { DataTable } from "@/components/academy/shared/data-table";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AssessmentStatusTag } from "@/components/assessments/assessment-tags";
import { CategoryTag } from "@/components/content/content-tags";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getMentorAssessments } from "@/lib/server/assessments/service";
import { formatIstDay } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Assessments" };

export default async function MentorAssessmentsPage() {
  const result = await getMentorAssessments();
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Assessments" subtitle="Set written assessments for your batches and review submissions." primaryAction={<Button asChild className="min-h-11"><Link href="/mentor/assessments/new">New assessment</Link></Button>} />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load assessments. Please try again."} />
      ) : result.data.length === 0 ? (
        <div className="glass-regular rounded-card"><EmptyState icon={<ClipboardCheck aria-hidden="true" size={22} />} title="No assessments yet" description="Create one for a batch you teach; it stays a draft until you open it." /></div>
      ) : (
        <div className="glass-regular rounded-card p-2 sm:p-4">
          <DataTable caption="Assessments" rows={result.data} getRowKey={(a) => a.id} getRowHref={(a) => `/mentor/assessments/${a.id}`} columns={[
            { key: "title", header: "Assessment", cell: (a) => <span className="flex flex-col"><span className="text-ink">{a.title}</span><span className="text-[12px] text-ink-secondary">{a.batchName ?? "Batch"}</span></span> },
            { key: "category", header: "Category", cell: (a) => <CategoryTag category={a.category} /> },
            { key: "status", header: "Status", cell: (a) => <AssessmentStatusTag status={a.status} /> },
            { key: "due", header: "Due", cell: (a) => (a.dueAt ? formatIstDay(a.dueAt) : <span className="text-ink-secondary">No due date</span>) },
            { key: "subs", header: "Submitted", cell: (a) => a.submitted },
            { key: "rev", header: "Reviewed", cell: (a) => `${a.reviewed} / ${a.submitted}` },
          ]} />
        </div>
      )}
    </div>
  );
}
