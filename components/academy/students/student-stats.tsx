import { MetricCard } from "@/components/academy/shared/metric-card";
import { buildStudentHref } from "@/lib/server/academy-people/validation";
import type { DashboardMetric } from "@/types/academy";
import type { AcademyStudentSummary } from "@/types/academy-people";

// Real counts over the whole academy (never just the filtered page). Each card
// also opens the list already filtered to the students it counts.
export function StudentStats({ summary }: { summary: AcademyStudentSummary }) {
  const metrics: DashboardMetric[] = [
    { id: "total", label: "Total Students", value: String(summary.total), detail: "In your academy", icon: "students", tone: "indigo", href: buildStudentHref({}) },
    {
      id: "in-batch",
      label: "In a Batch",
      value: String(summary.inBatch),
      detail: summary.total === 0 ? "No students yet" : `${summary.withoutBatch} without a batch`,
      icon: "batches",
      tone: "success",
      href: buildStudentHref({}),
    },
    {
      id: "no-batch",
      label: "Without Batch",
      value: String(summary.withoutBatch),
      detail: summary.withoutBatch === 0 ? "Everyone is in a batch" : "Not yet assigned",
      icon: "attention",
      tone: "warning",
      href: buildStudentHref({ batch: "none" }),
    },
    {
      id: "suspended",
      label: "Suspended Accounts",
      value: String(summary.suspended),
      detail: summary.suspended === 0 ? "None suspended" : "Can't log in",
      icon: "activeStudents",
      tone: "info",
      href: buildStudentHref({ status: "suspended" }),
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
