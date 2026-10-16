import Link from "next/link";
import { cn } from "cn";
import type { SessionFilter } from "@/types/sessions";

const TABS: [SessionFilter, string][] = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
];

export function SessionFilterTabs({ active, hrefFor }: { active: SessionFilter; hrefFor: (f: SessionFilter) => string }) {
  return (
    <nav aria-label="Session filter" className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map(([value, label]) => (
        <Link
          key={value}
          href={hrefFor(value)}
          aria-current={value === active ? "page" : undefined}
          className={cn("inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-[13px] no-underline", value === active ? "border-brand-accent text-brand-accent" : "border-hairline text-ink-secondary hover:text-ink")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
