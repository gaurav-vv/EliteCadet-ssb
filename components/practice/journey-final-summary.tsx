"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JourneyProgressRing } from "@/components/practice/journey-progress-ring";
import { getProgressCounts } from "@/lib/student/ssb-journey-progress";

interface DaySummary {
  dayId: string;
  dayNumber: number;
  title: string;
  modules: { moduleId: string; itemIds: string[] }[];
}

export function JourneyFinalSummary({ days }: { days: DaySummary[] }) {
  // Starts empty (matching SSR, which falls back to the `?? {done: 0, total: ...}`
  // below) and is filled in after mount — see journey-progress-ring.tsx for
  // why a direct/lazy-initializer localStorage read here would instead cause
  // a hydration text mismatch (React error #418) once any progress exists.
  const [dayCounts, setDayCounts] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    const next: Record<string, { done: number; total: number }> = {};
    for (const day of days) {
      next[day.dayId] = getProgressCounts(
        day.modules.map((m) => ({ dayId: day.dayId, moduleId: m.moduleId, itemIds: m.itemIds })),
      );
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe external-store (localStorage) read, not derived state
    setDayCounts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on mount; `days` is a fresh array from the server each render
  }, []);

  const allModules = days.flatMap((day) => day.modules.map((m) => ({ dayId: day.dayId, moduleId: m.moduleId, itemIds: m.itemIds })));

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-regular px-6 py-6">
        <JourneyProgressRing modules={allModules} />
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const counts = dayCounts[day.dayId] ?? { done: 0, total: day.modules.reduce((sum, m) => sum + m.itemIds.length, 0) };
          const percent = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
          return (
            <Link
              key={day.dayId}
              href={`/student/practice/${day.dayId}`}
              className="glass-regular row-hover-tint flex flex-col gap-2 rounded-card px-5 py-4 no-underline"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  Day {day.dayNumber} — {day.title}
                </span>
                <span className="text-xs text-ink-secondary">
                  {counts.total > 0 ? `${counts.done} of ${counts.total} done` : "No bank items"}
                </span>
              </div>
              {counts.total > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                  <div className="h-full rounded-full bg-brand-accent" style={{ width: `${percent}%` }} />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
