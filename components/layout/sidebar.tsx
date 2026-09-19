"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcons, type NavIconName } from "@/components/ui/nav-icons";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

interface SidebarProps {
  roleLabel: string;
  items: SidebarNavItem[];
}

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === rootHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ roleLabel, items }: SidebarProps) {
  const pathname = usePathname();
  const rootHref = items[0]?.href ?? "/";

  return (
    <aside className="glass-thick sticky top-20 hidden h-fit w-[220px] shrink-0 flex-col gap-1 rounded-panel p-3 md:flex lg:w-[260px]">
      <p className="px-3 pt-1 pb-3 text-[11px] font-semibold tracking-wide text-ink-secondary uppercase">
        {roleLabel}
      </p>
      {items.map((item) => {
        const Icon = navIcons[item.icon];
        const active = isActive(pathname, item.href, rootHref);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            aria-current={active ? "page" : undefined}
            className="nav-item flex items-center gap-3 rounded-pill px-4 py-2.5 text-sm font-medium text-ink-secondary no-underline"
          >
            <Icon aria-hidden="true" size={18} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
