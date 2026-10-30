"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MonthlyPoint {
  month: string;
  avgPct: number;
  count: number;
}

// The recharts part of the "Average Score by Month" card, split out so the card (title,
// empty state) renders at once and this large dependency loads on its own.
export function StudentPerformanceLine({ data }: { data: MonthlyPoint[] }) {
  return (
    <div role="img" aria-label={`Average score by month: ${data.map((p) => `${p.month} ${p.avgPct}% from ${p.count} reviews`).join(", ")}`} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "var(--hairline)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--hairline)", boxShadow: "var(--shadow-md)", fontSize: 13, color: "var(--ink)" }}
            formatter={(value, _name, item) => [`${value}% (${(item?.payload as MonthlyPoint | undefined)?.count ?? 0} reviews)`, "Average"]}
          />
          <Line dataKey="avgPct" type="monotone" stroke="var(--academy-chart-overall)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
