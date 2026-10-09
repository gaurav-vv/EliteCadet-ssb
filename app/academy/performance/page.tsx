import type { Metadata } from "next";
import { CircleCheck, Layers } from "lucide-react";
import { DataTable } from "@/components/academy/shared/data-table";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { ProgressStats } from "@/components/progress/progress-views";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademyPerformance } from "@/lib/server/progress/service";

export const metadata: Metadata = { title: "Performance" };

const pct = (v: number | null) => (v === null ? <span className="text-ink-secondary">—</span> : `${v}%`);

// Academy-wide view (specs.md §8a.4d): per-batch averages and the students who
// need attention, each with the rule that flagged them. Scoped to the admin's
// own academy on the server and by RLS.
export default async function AcademyPerformancePage() {
  const result = await getAcademyPerformance(new Date().toISOString());
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Performance" subtitle="Mentor-reviewed scores and marked attendance across your batches." />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load performance. Please try again."} />
      ) : (
        <>
          <ProgressStats summary={result.data.academy} />

          <section aria-labelledby="attention-heading" className="flex flex-col gap-3">
            <h2 id="attention-heading" className="text-[18px] font-semibold text-ink">Needs attention</h2>
            <div className="glass-regular rounded-card p-2 sm:p-4">
              {result.data.attention.length === 0 ? (
                <EmptyState icon={<CircleCheck aria-hidden="true" size={22} />} title="No one is flagged right now" description="Students appear here for low scores, no recent submissions or low attendance." />
              ) : (
                <DataTable
                  caption="Students who need attention"
                  rows={result.data.attention}
                  getRowKey={(s) => s.studentId}
                  getRowHref={(s) => `/academy/students/${s.studentId}`}
                  columns={[
                    { key: "name", header: "Student", cell: (s) => s.name },
                    { key: "batch", header: "Batch", cell: (s) => s.batchName ?? <span className="text-ink-secondary">No batch</span> },
                    { key: "reason", header: "Reason", cell: (s) => <StatusBadge label={s.reason} tone="warning" /> },
                  ]}
                />
              )}
            </div>
          </section>

          <section aria-labelledby="batches-heading" className="flex flex-col gap-3">
            <h2 id="batches-heading" className="text-[18px] font-semibold text-ink">By batch</h2>
            <div className="glass-regular rounded-card p-2 sm:p-4">
              {result.data.batches.length === 0 ? (
                <EmptyState icon={<Layers aria-hidden="true" size={22} />} title="No active batches" description="Create a batch and add students to see its performance." />
              ) : (
                <DataTable
                  caption="Performance by batch"
                  rows={result.data.batches}
                  getRowKey={(b) => b.batchId}
                  getRowHref={(b) => `/academy/batches/${b.batchId}`}
                  columns={[
                    { key: "name", header: "Batch", cell: (b) => b.batchName },
                    { key: "students", header: "Students", cell: (b) => b.students },
                    { key: "reviewed", header: "Reviewed", cell: (b) => b.reviewedCount },
                    { key: "score", header: "Avg Score", cell: (b) => pct(b.avgScorePct) },
                    { key: "attendance", header: "Attendance", cell: (b) => pct(b.attendancePct) },
                  ]}
                />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
