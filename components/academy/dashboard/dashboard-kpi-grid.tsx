import { MetricCard } from "@/components/academy/shared/metric-card";
import type { DashboardMetric } from "@/types/academy";

export function DashboardKpiGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section aria-label="Academy summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
