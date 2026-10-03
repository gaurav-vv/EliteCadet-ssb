import Link from "next/link";
import { IconTile } from "@/components/academy/shared/icon-tile";
import type { DashboardMetric } from "@/types/academy";

interface MetricCardProps {
  metric: DashboardMetric;
}

// Takes one metric object so an API response can replace the mock-backed data
// without touching this component (see lib/academy/dashboard-view.ts).
export function MetricCard({ metric }: MetricCardProps) {
  return (
    <Link
      href={metric.href}
      className="glass-regular glass-hover-lift flex items-center gap-3 rounded-card p-4 no-underline 2xl:gap-4 2xl:p-5"
    >
      <IconTile icon={metric.icon} tone={metric.tone} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[28px] leading-none font-bold text-ink tabular-nums">{metric.value}</span>
        <span className="mt-1.5 text-[14px] leading-tight font-medium whitespace-nowrap text-ink">{metric.label}</span>
        <span className="text-[12px] text-ink-secondary">{metric.detail}</span>
      </span>
    </Link>
  );
}
