import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  // Heading id so the surrounding region can reference it with aria-labelledby.
  id?: string;
  // Extra control beside the action (range selector, "Demo data" badge…).
  extra?: React.ReactNode;
  // Small inline marker under the title (e.g. "Demo data").
  badge?: React.ReactNode;
}

export function SectionHeader({ title, description, action, id, extra, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[18px] leading-tight font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-secondary">{description}</p>}
        {badge && <div className="mt-1.5">{badge}</div>}
      </div>
      {extra}
      {action && (
        <Link
          href={action.href}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-medium text-brand-accent no-underline hover:underline sm:min-h-0"
        >
          {action.label}
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      )}
    </div>
  );
}
