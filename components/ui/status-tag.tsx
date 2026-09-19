import { cn } from "cn";

type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StatusTagProps {
  label: string;
  tone: StatusTone;
}

const dotClass: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink-secondary",
};

const textClass: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-ink-secondary",
};

// Status is never colour-only (AGENTS.md §7.10): always a dot AND a text label.
export function StatusTag({ label, tone }: StatusTagProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", textClass[tone])}>
      <span className={cn("size-1.5 rounded-full", dotClass[tone])} aria-hidden="true" />
      {label}
    </span>
  );
}
