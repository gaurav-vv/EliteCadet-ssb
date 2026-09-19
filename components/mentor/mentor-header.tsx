"use client";

import Link from "next/link";
import { Bell, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface MentorHeaderProps {
  mentorName: string;
}

export function MentorHeader({ mentorName }: MentorHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-bg-base/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <Link
          href="/mentor"
          className="text-base font-semibold tracking-tight text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy-500"
        >
          SSB Academy
        </Link>

        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell aria-hidden="true" size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <PopoverHeader>
                <PopoverTitle>Notifications</PopoverTitle>
              </PopoverHeader>
              <EmptyState title="You're all caught up" description="No notifications yet." />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Account menu for ${mentorName}`}>
                <UserCircle aria-hidden="true" size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/mentor/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => logoutAction()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
