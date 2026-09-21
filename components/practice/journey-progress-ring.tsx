"use client";

import { useEffect, useState } from "react";
import { getProgressCounts, type JourneyProgressCounts } from "@/lib/student/ssb-journey-progress";

interface JourneyProgressRingProps {
  modules: { dayId: string; moduleId: string; itemIds: string[] }[];
}

const EMPTY_COUNTS: JourneyProgressCounts = { done: 0, total: 0 };

// A conic-gradient ring, not a Recharts chart: the visualization is a single
// dynamic percentage with no series/axes/tooltips to justify pulling in a
// charting library (AGENTS.md §3 — Recharts only where a chart answers a
// real question). The gradient stops are computed at render time, the same
// reason app/student/page.tsx's trend bars already use an inline style
// instead of a Tailwind utility for their (also dynamic) height.
export function JourneyProgressRing({ modules }: JourneyProgressRingProps) {
  // State starts at the same value the server renders (0/0), then is
  // replaced by the real localStorage-derived value in an effect, which only
  // runs after hydration commits. Reading localStorage directly during
  // render — even via a useState lazy initializer — reruns on the client's
  // hydration pass too and returns a different value than the server saw,
  // producing a hydration text mismatch (React error #418) once any
  // progress exists. This is the one case eslint's react-hooks/set-state-in-effect
  // rule itself calls out as correct: "subscribe for updates from an
  // external system, calling setState in a callback" (localStorage here).
  const [counts, setCounts] = useState<JourneyProgressCounts>(EMPTY_COUNTS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above; this is a hydration-safe external-store read, not derived state
    setCounts(getProgressCounts(modules));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `modules` is a fresh array from the server each render; only re-run on mount
  }, []);

  const percent = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(var(--brand-accent) ${percent * 3.6}deg, var(--hairline) 0deg)` }}
        role="img"
        aria-label={`${percent} percent of your SSB practice journey complete`}
      >
        <div className="flex size-[72px] items-center justify-center rounded-full bg-[var(--surface-base)] text-[20px] font-bold text-ink">
          {percent}%
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Progress</span>
        <span className="text-[18px] font-bold text-ink">SSB Journey</span>
        <span className="text-[13px] text-ink-secondary">
          {counts.done} of {counts.total} questions
        </span>
      </div>
    </div>
  );
}
