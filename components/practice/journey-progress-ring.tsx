import type { BankProgress } from "@/types/practice";

// A conic-gradient ring, not a Recharts chart: one percentage, no axes or
// series (AGENTS.md §3). Counts come from the student's saved answers (0014).
export function JourneyProgressRing({ progress }: { progress: BankProgress }) {
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(var(--brand-accent) ${percent * 3.6}deg, var(--hairline) 0deg)` }}
        role="img"
        aria-label={`${percent} percent of your SSB practice journey complete`}
      >
        <div className="flex size-[72px] items-center justify-center rounded-full bg-[var(--surface-base)] text-[20px] font-bold text-ink">{percent}%</div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Progress</span>
        <span className="text-[18px] font-bold text-ink">SSB Journey</span>
        <span className="text-[13px] text-ink-secondary">
          {progress.done} of {progress.total} questions
        </span>
      </div>
    </div>
  );
}
