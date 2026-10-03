"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { DemoBadge } from "@/components/academy/shared/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalyticsSource, PerformanceTrendPoint } from "@/types/academy";

interface StudentPerformanceChartProps {
  data: PerformanceTrendPoint[];
  source: AnalyticsSource;
}

const RANGES = [
  { months: 3, label: "Last 3 Months" },
  { months: 6, label: "Last 6 Months" },
] as const;

// One line per question: "is performance improving over time?". Three series
// at most; each also has its own dash pattern so it is distinguishable
// without colour.
export function StudentPerformanceChart({ data, source }: StudentPerformanceChartProps) {
  const [months, setMonths] = useState<number>(6);
  const visible = data.slice(-months);

  const select = (
    <label className="shrink-0">
      <span className="sr-only">Time range</span>
      <select
        value={months}
        onChange={(e) => setMonths(Number(e.target.value))}
        className="h-9 rounded-control border border-hairline bg-white px-3 text-[13px] font-medium text-ink"
      >
        {RANGES.map((r) => (
          <option key={r.months} value={r.months}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ChartCard title="Student Performance Overview" headerExtra={select} badge={source === "demo" ? <DemoBadge /> : undefined} className="md:col-span-2 xl:col-span-1">
      {visible.length === 0 ? (
        <EmptyState
          icon={<LineChartIcon aria-hidden="true" size={22} />}
          title="No performance data yet"
          description="Scores appear here once students complete assessments."
        />
      ) : (
        <div
          role="img"
          aria-label={`Performance by month: ${visible.map((p) => `${p.month} overall ${p.overall}`).join(", ")}`}
          className="h-80 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visible} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid var(--hairline)", boxShadow: "var(--shadow-md)", fontSize: 13 }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line
                name="Overall"
                dataKey="overall"
                type="monotone"
                stroke="var(--academy-chart-overall)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                name="TAT/WAT/SRT"
                dataKey="tatWatSrt"
                type="monotone"
                stroke="var(--academy-chart-tat)"
                strokeWidth={2.5}
                strokeDasharray="7 4"
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                name="PPDT & GD"
                dataKey="ppdtGd"
                type="monotone"
                stroke="var(--academy-chart-ppdt)"
                strokeWidth={2.5}
                strokeDasharray="2 4"
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
