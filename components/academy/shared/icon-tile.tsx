import { navIcons, type NavIconName } from "@/components/ui/nav-icons";
import type { DashboardIconTone } from "@/types/academy";
import { cn } from "cn";

interface IconTileProps {
  icon: NavIconName;
  tone?: DashboardIconTone;
  size?: "md" | "lg";
  className?: string;
}

// Soft tinted square behind a line icon (metric cards, tasks, quick actions).
// Tint colours live in globals.css (.academy-tint) — never as Tailwind
// conditionals (AGENTS.md §7.12).
export function IconTile({ icon, tone = "indigo", size = "md", className }: IconTileProps) {
  const Icon = navIcons[icon];
  return (
    <span
      aria-hidden="true"
      data-tone={tone}
      className={cn(
        "academy-tint flex shrink-0 items-center justify-center rounded-control",
        size === "lg" ? "size-12" : "size-10",
        className,
      )}
    >
      <Icon size={size === "lg" ? 22 : 19} />
    </span>
  );
}
