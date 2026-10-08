"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { navIcons } from "@/components/ui/nav-icons";
import type { SidebarNavItem } from "@/components/layout/sidebar";

interface StudentSidebarProps {
  items: SidebarNavItem[];
  // Resolved on the server (lib/academy/brand-images → public/academy/sidebar-card.jpg).
  cardImage: string | null;
  userName: string;
}

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === rootHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Student-only sidebar: wordmark, same nav + active-state behaviour as the
// shared Sidebar, and the academy's promotional card at the foot.
export function StudentSidebar({ items, cardImage, userName }: StudentSidebarProps) {
  const pathname = usePathname();
  const rootHref = items[0]?.href ?? "/";

  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-3 bg-[#0e1836] px-3 py-4 md:flex lg:w-[256px]">
      <Link href="/" className="px-3 pb-2 text-[18px] font-bold tracking-tight text-white no-underline">
        SSB Academy
      </Link>
      <nav aria-label="Student" className="flex flex-col gap-0.5">
        <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-[0.1em] text-white/50 uppercase">Student</p>
        {items.map((item) => {
          const Icon = navIcons[item.icon];
          const active = isActive(pathname, item.href, rootHref);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/70 no-underline hover:text-white"
            >
              <Icon aria-hidden="true" size={16} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {cardImage && (
        <figure className="relative mt-auto mb-0 hidden aspect-[609/870] max-h-[240px] w-full overflow-hidden rounded-xl border border-white/10 [@media(min-height:760px)]:block">
          <Image
            src={cardImage}
            alt="Targeting Better Officers Together"
            fill
            sizes="256px"
            className="object-cover object-top"
          />
        </figure>
      )}
      <div className={`flex items-center gap-2 border-t border-white/10 pt-3 ${cardImage ? "" : "mt-auto"}`}>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white"
        >
          {userName.trim().charAt(0).toUpperCase() || "S"}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[12px] font-medium text-white">{userName}</span>
          <span className="text-[11px] text-white/60">Student</span>
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className="flex size-11 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut aria-hidden="true" size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
}
