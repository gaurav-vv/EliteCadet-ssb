"use client";

import dynamic from "next/dynamic";
import { LineChart as LineChartIcon } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import type { MonthlyPoint } from "@/components/academy/dashboard/student-performance-line";
import { EmptyState } from "@/components/ui/empty-state";

// The chart itself (recharts, about 350 KB) loads separately and only in the browser, where
// ResponsiveContainer measures it anyway. The placeholder has the chart's exact height (h-72)
// so nothing shifts when it arrives.
const StudentPerformanceLine = dynamic<{ data: MonthlyPoint[] }>(
  () => import("@/components/academy/dashboard/student-performance-line").then((m) => m.StudentPerformanceLine),
  { ssr: false, loading: () => <div aria-hidden="true" className="h-72 w-full" /> },
);

// One question: "are reviewed scores improving month by month?" One series,
// so no legend — the title names it.
export function StudentPerformanceChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ChartCard title="Average Score by Month" description="Mentor-reviewed assessments, academy-wide." className="md:col-span-2 xl:col-span-1">
      {data.length === 0 ? (
        <EmptyState icon={<LineChartIcon aria-hidden="true" size={22} />} title="No reviewed scores yet" description="The trend appears once mentors review assessments." />
      ) : (
        <StudentPerformanceLine data={data} />
      )}
    </ChartCard>
  );
}
