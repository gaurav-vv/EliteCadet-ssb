"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcons } from "@/components/ui/nav-icons";
import type { SidebarNavItem } from "@/components/layout/sidebar";

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === rootHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  const rootHref = items[0]?.href ?? "/";

  return (
    <nav className="glass-thick fixed inset-x-4 bottom-4 z-20 flex items-center justify-around gap-1 rounded-panel px-2 py-2 md:hidden">
      {items.map((item) => {
        const Icon = navIcons[item.icon];
        const active = isActive(pathname, item.href, rootHref);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            className="nav-item flex flex-col items-center gap-0.5 rounded-pill px-3 py-1.5 text-ink-secondary no-underline"
          >
            <Icon aria-hidden="true" size={18} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
