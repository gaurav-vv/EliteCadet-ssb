import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { IconTile } from "@/components/academy/shared/icon-tile";
import type { NavIconName } from "@/components/ui/nav-icons";
import type { DashboardIconTone } from "@/types/academy";

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: NavIconName;
  tone?: DashboardIconTone;
  // For actions whose page isn't built yet: rendered, but not a link.
  disabled?: boolean;
}

export function QuickAction({ title, description, href, icon, tone, disabled = false }: QuickActionProps) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold text-ink">{title}</span>
        <span className="line-clamp-2 text-[12px] text-ink-secondary">{disabled ? "Coming soon" : description}</span>
      </span>
      {!disabled && <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />}
    </>
  );
  const className = "glass-regular flex min-h-[72px] items-center gap-3 rounded-card p-4 no-underline";

  if (disabled) {
    return (
      <div role="link" aria-disabled="true" className={`${className} opacity-60`}>
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={`${className} glass-hover-lift`}>
      {body}
    </Link>
  );
}
