"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScorePoint } from "@/types/progress";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

// One series: reviewed score % over time. No legend (the card title names it);
// the table below the chart is the accessible view of the same points.
export function ScoreTrendChart({ points }: { points: ScorePoint[] }) {
  const data = points.map((p) => ({ ...p, day: day(p.reviewedAt) }));
  return (
    <div role="img" aria-label={`Score trend: ${data.map((p) => `${p.title} ${p.scorePct}% on ${p.day}`).join(", ")}`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-secondary)", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "var(--hairline)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--hairline)", boxShadow: "var(--shadow-md)", fontSize: 13, color: "var(--ink)" }}
            formatter={(value) => [`${value}%`, "Score"]}
            labelFormatter={(_, payload) => (payload?.[0]?.payload as { title?: string } | undefined)?.title ?? ""}
          />
          <Line dataKey="scorePct" type="monotone" stroke="var(--academy-chart-overall)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
