"use client";

import Link from "next/link";
import { Bell, ChevronDown, Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { logoutAction } from "@/lib/auth/actions";

interface TopHeaderProps {
  searchPlaceholder: string;
  userName: string;
  roleLabel: string;
  profileHref: string;
}

export function TopHeader({ searchPlaceholder, userName, roleLabel, profileHref }: TopHeaderProps) {
  return (
    <header className="glass-thick sticky top-4 z-10 mx-4 flex h-16 items-center justify-between gap-4 rounded-panel px-4 md:mx-6">
      <Link
        href="/"
        className="hidden shrink-0 text-base font-semibold tracking-tight text-ink no-underline sm:block"
      >
        SSB Academy
      </Link>

      <label className="glass-thin flex min-w-0 flex-1 items-center gap-2 rounded-pill px-4 py-2 sm:max-w-xs">
        <Search aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </label>

      <div className="flex shrink-0 items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="glass-thin relative flex size-9 items-center justify-center rounded-pill text-ink-secondary transition-colors hover:text-ink"
            >
              <Bell aria-hidden="true" size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-panel border-none bg-transparent p-0 shadow-none">
            <div className="glass-thick rounded-panel p-4">
              <PopoverHeader className="px-0 pt-0">
                <PopoverTitle>Notifications</PopoverTitle>
              </PopoverHeader>
              <EmptyState title="You're all caught up" description="No notifications yet." />
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-pill py-1 pr-2 pl-1 text-left transition-colors hover:bg-black/4"
            >
              <UserCircle aria-hidden="true" size={28} className="text-ink-secondary" />
              <span className="hidden flex-col sm:flex">
                <span className="text-sm leading-tight font-medium text-ink">{userName}</span>
                <span className="text-[11px] leading-tight text-ink-secondary">{roleLabel}</span>
              </span>
              <ChevronDown aria-hidden="true" size={14} className="text-ink-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={profileHref}>Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logoutAction()}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
