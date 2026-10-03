import { MetricCard } from "@/components/academy/shared/metric-card";
import { buildBatchListHref } from "@/lib/academy/batch-list";
import type { BatchSummary, DashboardMetric } from "@/types/academy";

// Counts come straight from Postgres (see getBatchSummary) and cover the whole
// academy, never just the filtered page. Each card also links to the matching list.
export function BatchStats({ summary }: { summary: BatchSummary }) {
  const metrics: DashboardMetric[] = [
    {
      id: "total",
      label: "Total Batches",
      value: String(summary.total),
      detail: `${summary.total - summary.active} archived`,
      icon: "batches",
      tone: "indigo",
      href: buildBatchListHref({ status: "all" }),
    },
    {
      id: "active",
      label: "Active Batches",
      value: String(summary.active),
      detail: "Currently running",
      icon: "evaluations",
      tone: "success",
      href: buildBatchListHref({}),
    },
    {
      id: "no-mentor",
      label: "Without Mentor",
      value: String(summary.withoutMentor),
      detail: summary.withoutMentor === 0 ? "Every active batch has a mentor" : "Active, needs a mentor",
      icon: "mentors",
      tone: "warning",
      href: buildBatchListHref({ mentor: "none" }),
    },
  ];

  return (
    <section aria-label="Batch summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
