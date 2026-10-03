import { MetricCard } from "@/components/academy/shared/metric-card";
import { buildStudentListHref } from "@/lib/academy/student-list";
import type { DashboardMetric, StudentSummary } from "@/types/academy";

// Each card is also a shortcut: it opens the list already filtered to the
// students it counts. Counts always cover the whole academy, not the current filter.
export function StudentStats({ summary }: { summary: StudentSummary }) {
  const metrics: DashboardMetric[] = [
    {
      id: "total",
      label: "Total Students",
      value: String(summary.total),
      detail: "All students",
      icon: "students",
      tone: "indigo",
      href: buildStudentListHref({}),
    },
    {
      id: "active",
      label: "Active Students",
      value: String(summary.active),
      detail: summary.total === 0 ? "No students yet" : `${summary.total - summary.active} inactive`,
      icon: "activeStudents",
      tone: "success",
      href: buildStudentListHref({ status: "active" }),
    },
    {
      id: "no-batch",
      label: "Without Batch",
      value: String(summary.withoutBatch),
      detail: summary.withoutBatch === 0 ? "Everyone is in a batch" : "Not yet assigned",
      icon: "batches",
      tone: "info",
      href: buildStudentListHref({ batch: "none" }),
    },
    {
      id: "attention",
      label: "Needing Attention",
      value: String(summary.needingAttention),
      detail: summary.needingAttention === 0 ? "All on track" : "No recent practice",
      icon: "attention",
      tone: "warning",
      href: buildStudentListHref({ status: "attention" }),
    },
  ];

  return (
    <section aria-label="Student summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
