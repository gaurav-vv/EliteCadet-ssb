"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { EmptyState } from "@/components/ui/empty-state";

interface Point {
  month: string;
  avgPct: number;
  count: number;
}

// One question: "are reviewed scores improving month by month?" One series,
// so no legend — the title names it.
export function StudentPerformanceChart({ data }: { data: Point[] }) {
  return (
    <ChartCard title="Average Score by Month" description="Mentor-reviewed assessments, academy-wide." className="md:col-span-2 xl:col-span-1">
      {data.length === 0 ? (
        <EmptyState icon={<LineChartIcon aria-hidden="true" size={22} />} title="No reviewed scores yet" description="The trend appears once mentors review assessments." />
      ) : (
        <div role="img" aria-label={`Average score by month: ${data.map((p) => `${p.month} ${p.avgPct}% from ${p.count} reviews`).join(", ")}`} className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
              <Tooltip
                cursor={{ stroke: "var(--hairline)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--hairline)", boxShadow: "var(--shadow-md)", fontSize: 13, color: "var(--ink)" }}
                formatter={(value, _name, item) => [`${value}% (${(item?.payload as Point | undefined)?.count ?? 0} reviews)`, "Average"]}
              />
              <Line dataKey="avgPct" type="monotone" stroke="var(--academy-chart-overall)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
