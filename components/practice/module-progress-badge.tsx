import type { BankProgress } from "@/types/practice";

export function ModuleProgressBadge({ progress, mode }: { progress: BankProgress; mode: "practice" | "test" }) {
  if (mode === "test") {
    return (
      <span className="text-xs whitespace-nowrap text-ink-secondary">
        {progress.total} {progress.total === 1 ? "Question" : "Questions"}
      </span>
    );
  }
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex w-28 shrink-0 flex-col items-end gap-1">
      <span className="text-xs whitespace-nowrap text-ink-secondary">
        {progress.done} of {progress.total} done
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
