import Link from "next/link";
import { JourneyProgressRing } from "@/components/practice/journey-progress-ring";
import type { BankProgress, JourneyDayProgress } from "@/types/practice";

export function JourneyFinalSummary({ overall, days }: { overall: BankProgress; days: JourneyDayProgress[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-regular px-6 py-6">
        <JourneyProgressRing progress={overall} />
      </div>
      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const percent = day.total > 0 ? Math.round((day.done / day.total) * 100) : 0;
          return (
            <Link key={day.dayId} href={`/student/practice/${day.dayId}`} className="glass-regular row-hover-tint flex flex-col gap-2 rounded-card px-5 py-4 no-underline">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  Day {day.dayNumber} — {day.title}
                </span>
                <span className="text-xs text-ink-secondary">{day.total > 0 ? `${day.done} of ${day.total} done` : "No bank items"}</span>
              </div>
              {day.total > 0 && (
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
