import { cn } from "cn";
import type { DashboardIconTone } from "@/types/academy";

interface ProgressBarProps {
  // 0–100, or null when there is nothing to measure yet.
  value: number | null;
  label: string;
  // Fill colour; set via .academy-progress-fill in globals.css (§7.12).
  tone?: DashboardIconTone;
  // Optional text meaning of the colour, e.g. "Good" — announced and shown on hover.
  statusLabel?: string;
  // Text shown instead of "74%" (e.g. "74/100") and when there is no value.
  valueLabel?: string;
  emptyLabel?: string;
  className?: string;
}

export function ProgressBar({ value, label, tone = "indigo", statusLabel, valueLabel, emptyLabel = "No scores yet", className }: ProgressBarProps) {
  if (value === null) {
    return <span className="text-[13px] text-ink-secondary">{emptyLabel}</span>;
  }
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-2", className)} title={statusLabel}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={statusLabel ? `${clamped}%, ${statusLabel}` : `${clamped}%`}
        className="h-2 min-w-10 flex-1 overflow-hidden rounded-pill bg-black/[0.07]"
      >
        <div data-tone={tone} className="academy-progress-fill h-full rounded-pill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="shrink-0 text-right text-[13px] font-medium text-ink tabular-nums" style={{ minWidth: "2.25rem" }}>
        {valueLabel ?? `${clamped}%`}
      </span>
    </div>
  );
}
