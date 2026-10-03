"use client";

import Link from "next/link";
import { Bell, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { logoutAction } from "@/lib/auth/actions";

interface AcademyHeaderProps {
  academyName: string;
  adminName: string;
  roleLabel: string;
  searchPlaceholder: string;
  profileHref: string;
  // Hamburger + drawer, shown below md (see AcademyMobileNav).
  mobileNav: React.ReactNode;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function AcademyHeader({ academyName, adminName, roleLabel, searchPlaceholder, profileHref, mobileNav }: AcademyHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-white/90 px-4 backdrop-blur-sm sm:px-6">
      {mobileNav}

      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-pill border border-hairline bg-white px-4 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/25 sm:max-w-md">
        <Search aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
        <span className="sr-only">Search students, batches and mentors</span>
        <Input
          type="search"
          placeholder={searchPlaceholder}
          className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </label>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="flex size-11 items-center justify-center rounded-pill text-ink-secondary transition-colors hover:bg-black/5 hover:text-ink"
            >
              <Bell aria-hidden="true" size={19} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-card border border-hairline bg-white p-4 shadow-md">
            <PopoverHeader className="px-0 pt-0">
              <PopoverTitle>Notifications</PopoverTitle>
            </PopoverHeader>
            <EmptyState title="You're all caught up" description="No notifications yet." />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${adminName}`}
              className="flex min-h-11 items-center gap-2.5 rounded-pill py-1 pr-2 pl-1 text-left transition-colors hover:bg-black/5"
            >
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-(--academy-navy) text-[13px] font-semibold text-white"
              >
                {initialsOf(adminName)}
              </span>
              <span className="hidden flex-col leading-tight md:flex">
                <span className="text-sm font-semibold text-ink">{academyName}</span>
                <span className="text-[12px] text-ink-secondary">{roleLabel}</span>
              </span>
              <ChevronDown aria-hidden="true" size={14} className="hidden text-ink-secondary md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={profileHref}>Academy settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logoutAction()}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
