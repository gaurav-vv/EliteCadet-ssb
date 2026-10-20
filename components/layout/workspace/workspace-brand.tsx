import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface WorkspaceBrandProps {
  // The workspace's home, e.g. "/student".
  href: string;
  // Shown under the wordmark so the signed-in role is obvious at a glance
  // (specs.md §8a.1), e.g. "STUDENT", "ACADEMY".
  workspaceLabel: string;
  // The wordmark hides between md and lg, where the sidebar is an icon rail.
  collapsible?: boolean;
}

export function WorkspaceBrand({ href, workspaceLabel, collapsible = false }: WorkspaceBrandProps) {
  return (
    <Link
      href={href}
      aria-label={`SSB Path ${workspaceLabel} — dashboard`}
      className="flex items-center gap-3 rounded-control px-2 py-1 no-underline"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-(--academy-navy-line) bg-(--academy-navy-raised)">
        <ShieldCheck aria-hidden="true" size={22} className="text-(--academy-gold)" />
      </span>
      <span className={collapsible ? "hidden flex-col leading-tight lg:flex" : "flex flex-col leading-tight"}>
        <span className="text-[18px] font-bold text-white">SSB Path</span>
        <span className="text-[11px] font-semibold tracking-[0.16em] text-(--academy-gold) uppercase">{workspaceLabel}</span>
      </span>
    </Link>
  );
}
