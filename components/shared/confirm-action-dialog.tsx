"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ConfirmActionDialogProps {
  triggerLabel: string;
  // Accessible name for the trigger when the visible label is ambiguous.
  triggerAriaLabel?: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  // A Server Action (optionally .bind()-ed with its arguments on the server).
  action: () => Promise<{ ok: boolean; error?: { message: string } }>;
}

// One confirmation pattern for every irreversible-feeling admin action
// (AGENTS.md §7.5): the outcome or error shows inside the dialog, never lost.
export function ConfirmActionDialog({ triggerLabel, triggerAriaLabel, title, description, confirmLabel, destructive, action }: ConfirmActionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={destructive ? "destructive" : "outline"} className="min-h-11" aria-label={triggerAriaLabel}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-panel sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} className="min-h-11" onClick={confirm} disabled={pending}>
            {pending ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
