import { cn } from "cn";
import type { DashboardTone } from "@/types/academy";

interface StatusBadgeProps {
  label: string;
  tone: DashboardTone;
  className?: string;
}

const toneClass: Record<DashboardTone, { badge: string; dot: string }> = {
  success: { badge: "bg-success-bg text-(--academy-success-text)", dot: "bg-success" },
  warning: { badge: "bg-warning-bg text-(--academy-warning-text)", dot: "bg-warning" },
  danger: { badge: "bg-danger-bg text-(--academy-danger-text)", dot: "bg-danger" },
  info: { badge: "bg-brand-accent/10 text-brand-accent", dot: "bg-brand-accent" },
  neutral: { badge: "bg-black/5 text-ink-secondary", dot: "bg-ink-secondary" },
};

// Status is never colour-only (AGENTS.md §7.10): a dot and a text label.
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  const t = toneClass[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium whitespace-nowrap", t.badge, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", t.dot)} />
      {label}
    </span>
  );
}
