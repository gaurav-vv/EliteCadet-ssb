import Link from "next/link";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import type { DashboardTone } from "@/types/academy";

interface ActivityItemProps {
  name: string;
  description: string;
  timestamp: string;
  badge?: { label: string; tone: DashboardTone };
  href?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function ActivityItem({ name, description, timestamp, badge, href }: ActivityItemProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-[13px] font-semibold text-brand-accent"
      >
        {initialsOf(name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium text-ink">{name}</span>
        <span className="text-[12px] text-ink-secondary">
          {description} · {timestamp}
        </span>
      </span>
      {badge && <StatusBadge label={badge.label} tone={badge.tone} />}
    </>
  );
  const className = "row-hover-tint -mx-2 flex items-center gap-3 rounded-control px-2 py-2.5 no-underline";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
