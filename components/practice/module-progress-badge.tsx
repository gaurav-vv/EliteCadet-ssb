"use client";

import { useEffect, useState } from "react";
import { countDoneForModule } from "@/lib/student/ssb-journey-progress";

interface ModuleProgressBadgeProps {
  dayId: string;
  moduleId: string;
  itemIds: string[];
  mode: "practice" | "test";
}

export function ModuleProgressBadge({ dayId, moduleId, itemIds, mode }: ModuleProgressBadgeProps) {
  // Starts at 0 (matching SSR) and is replaced after mount — a direct
  // localStorage read during render, even via a lazy useState initializer,
  // would differ between the server pass and the client's hydration pass
  // once any item is done, causing a hydration text mismatch (React error
  // #418). See journey-progress-ring.tsx for the fuller explanation.
  const [done, setDone] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe external-store (localStorage) read, not derived state
    setDone(countDoneForModule(dayId, moduleId, itemIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on mount; itemIds is a fresh array each render
  }, []);

  if (mode === "test") {
    return (
      <span className="text-xs whitespace-nowrap text-ink-secondary">
        {itemIds.length} {itemIds.length === 1 ? "Question" : "Questions"}
      </span>
    );
  }

  const percent = itemIds.length > 0 ? Math.round((done / itemIds.length) * 100) : 0;

  return (
    <div className="flex w-28 shrink-0 flex-col items-end gap-1">
      <span className="text-xs whitespace-nowrap text-ink-secondary">
        {done} of {itemIds.length} done
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
