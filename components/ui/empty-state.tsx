import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

// One pattern, reused everywhere (AGENTS.md §7.5): small icon, one bold
// line, one muted line, optional inline action. Never an illustration.
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-ink-secondary">{icon}</div>}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description && <p className="text-[13px] text-ink-secondary">{description}</p>}
      {action}
    </div>
  );
}
