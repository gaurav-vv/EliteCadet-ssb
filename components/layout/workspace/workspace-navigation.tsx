"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcons } from "@/components/ui/nav-icons";
import { isWorkspaceNavActive, type WorkspaceNavItem } from "@/lib/navigation/workspace";
import { cn } from "cn";

interface WorkspaceNavigationProps {
  items: WorkspaceNavItem[];
  // Accessible name of the nav landmark, e.g. "Student".
  label: string;
  // "rail" collapses to icons between md and lg; "full" always shows labels
  // (desktop ≥lg is rendered with "rail" too, the drawer uses "full").
  variant?: "rail" | "full";
  onNavigate?: () => void;
}

export function WorkspaceNavigation({ items, label, variant = "full", onNavigate }: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const isRail = variant === "rail";
  const rootHref = items[0]?.href ?? "/";

  return (
    <nav aria-label={label} className="flex flex-col gap-1 [@media(max-height:820px)]:gap-0.5">
      {items.map((item) => {
        const Icon = navIcons[item.icon];
        const disabled = item.availability === "soon";
        const active = !disabled && isWorkspaceNavActive(pathname, item.href, rootHref);
        const itemClass = cn(
          "workspace-nav-item flex items-center gap-3 rounded-button px-3 py-2.5 text-sm [@media(max-height:820px)]:py-1.5 font-medium text-(--academy-nav-fg) no-underline",
          isRail && "max-lg:justify-center max-lg:px-0",
        );
        const content = (
          <>
            <Icon aria-hidden="true" size={19} className="shrink-0" />
            <span className={cn("flex-1 truncate", isRail && "max-lg:sr-only")}>{item.label}</span>
            {disabled && (
              <span
                className={cn(
                  "rounded-pill border border-(--academy-navy-line) px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                  isRail && "max-lg:hidden",
                )}
              >
                Soon
              </span>
            )}
          </>
        );

        if (disabled) {
          return (
            <span
              key={item.href}
              role="link"
              aria-disabled="true"
              title={`${item.label} — coming soon`}
              data-active="false"
              data-disabled="true"
              className={itemClass}
            >
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            title={isRail ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            data-active={active}
            data-disabled="false"
            onClick={onNavigate}
            className={itemClass}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
