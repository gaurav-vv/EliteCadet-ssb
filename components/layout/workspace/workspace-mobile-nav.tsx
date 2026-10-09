"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { WorkspaceBrand } from "@/components/layout/workspace/workspace-brand";
import { WorkspaceNavigation } from "@/components/layout/workspace/workspace-navigation";
import type { WorkspaceNavItem } from "@/lib/navigation/workspace";

interface WorkspaceMobileNavProps {
  items: WorkspaceNavItem[];
  workspaceLabel: string;
  // Server-rendered WorkspaceSidebarFooter, passed through so the drawer and
  // the desktop sidebar share one footer implementation.
  footer: React.ReactNode;
}

// Below md the sidebar becomes a left drawer opened from the header.
export function WorkspaceMobileNav({ items, workspaceLabel, footer }: WorkspaceMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="flex size-11 shrink-0 items-center justify-center rounded-button border border-hairline bg-white text-ink md:hidden"
        >
          <Menu aria-hidden="true" size={20} />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="workspace-app workspace-sidebar fixed inset-y-0 left-0 z-50 flex w-[288px] max-w-[85vw] flex-col gap-6 overflow-y-auto p-4 outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
        >
          <DialogPrimitive.Title className="sr-only">{workspaceLabel} navigation</DialogPrimitive.Title>
          <div className="flex items-center justify-between gap-2">
            <WorkspaceBrand href={items[0]?.href ?? "/"} workspaceLabel={workspaceLabel} />
            <DialogPrimitive.Close
              aria-label="Close navigation menu"
              className="flex size-11 items-center justify-center rounded-button text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" size={20} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1">
            <WorkspaceNavigation items={items} label={workspaceLabel} variant="full" onNavigate={() => setOpen(false)} />
          </div>
          {footer}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
