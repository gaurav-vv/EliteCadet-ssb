import { MetricCard } from "@/components/academy/shared/metric-card";
import { buildStudentListHref } from "@/lib/academy/student-list";
import type { DashboardMetric, StudentSummary } from "@/types/academy";

// Counts come straight from Postgres (see getStudentSummary) and cover the whole
// academy, never just the filtered page. Each card also links to the matching list.
export function StudentStats({ summary }: { summary: StudentSummary }) {
  const metrics: DashboardMetric[] = [
    {
      id: "total",
      label: "Total Students",
      value: String(summary.total),
      detail: `${summary.total - summary.active} inactive`,
      icon: "students",
      tone: "indigo",
      href: buildStudentListHref({}),
    },
    {
      id: "active",
      label: "Active Students",
      value: String(summary.active),
      detail: summary.total === 0 ? "No students yet" : "Currently enrolled",
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
  ];

  return (
    <section aria-label="Student summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
