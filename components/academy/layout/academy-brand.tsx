import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface AcademyBrandProps {
  // The wordmark hides between md and lg, where the sidebar is an icon rail.
  collapsible?: boolean;
}

export function AcademyBrand({ collapsible = false }: AcademyBrandProps) {
  return (
    <Link
      href="/academy"
      aria-label="SSB Path Academy — dashboard"
      className="flex items-center gap-3 rounded-control px-2 py-1 no-underline"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-(--academy-navy-line) bg-(--academy-navy-raised)">
        <ShieldCheck aria-hidden="true" size={22} className="text-(--academy-gold)" />
      </span>
      <span className={collapsible ? "hidden flex-col leading-tight lg:flex" : "flex flex-col leading-tight"}>
        <span className="text-[18px] font-bold text-white">SSB Path</span>
        <span className="text-[11px] font-semibold tracking-[0.16em] text-(--academy-gold)">ACADEMY</span>
      </span>
    </Link>
  );
}
