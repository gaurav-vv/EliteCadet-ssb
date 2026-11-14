"use client";

import dynamic from "next/dynamic";
import type { ScorePoint } from "@/types/progress";

// recharts is large (about 350 KB). Pages that only import this module path (the
// student and academy dashboards reach it through progress-views.tsx) must not pay for
// it, and pages that draw the chart should not block hydration on it. The chart is
// measured in the browser anyway (ResponsiveContainer renders nothing on the server),
// so skipping server rendering loses nothing. The placeholder has the chart's exact
// height (h-64) so nothing shifts when it arrives.
export const ScoreTrendChart = dynamic<{ points: ScorePoint[] }>(
  () => import("@/components/progress/score-trend-chart").then((m) => m.ScoreTrendChart),
  { ssr: false, loading: () => <div aria-hidden="true" className="h-64 w-full" /> },
);
