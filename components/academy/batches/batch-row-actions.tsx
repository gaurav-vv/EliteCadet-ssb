"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { EditBatchDialog } from "@/components/academy/batches/batch-form-dialog";
import { Toast } from "@/components/academy/shared/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setBatchStatusAction, type BatchActionResult } from "@/lib/actions/batches";
import type { BatchRecord } from "@/types/academy";

const TOAST_MS = 4000;

interface BatchRowActionsProps {
  batch: BatchRecord;
}

// Every item is wired to real data: edit, the batch page (mentors and
// students), archive/restore. No "Delete": batches are archived so their
// membership history is never orphaned.
export function BatchRowActions({ batch }: BatchRowActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  // Shown inside the confirm dialog: a toast would sit behind the modal.
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function notify(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  // Returns an error message on failure, or null on success. With
  // `inlineError` the caller shows the message itself instead of a toast.
  async function run(action: () => Promise<BatchActionResult>, success: string, inlineError = false): Promise<string | null> {
    setPending(true);
    let message: string | null = null;
    try {
      const result = await action();
      if (!result.ok) message = result.error?.message ?? "That didn't work. Please try again.";
    } catch {
      message = "We couldn't reach the server. Please try again.";
    } finally {
      setPending(false);
    }
    if (message) {
      if (!inlineError) notify(message, "error");
      return message;
    }
    notify(success);
    router.refresh();
    return null;
  }

  const archived = batch.status === "archived";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${batch.name}`}
            disabled={pending}
            className="inline-flex size-11 items-center justify-center rounded-button text-ink-secondary transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-50 md:size-9"
          >
            <MoreHorizontal aria-hidden="true" size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit batch</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/academy/batches/${batch.id}`}>Manage mentors & students</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {archived ? (
            <DropdownMenuItem onSelect={() => void run(() => setBatchStatusAction(batch.id, "active"), `${batch.name} was restored.`)}>
              Restore batch
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => {
                setArchiveError(null);
                setArchiveOpen(true);
              }}
            >
              Archive batch
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditBatchDialog batch={batch} open={editOpen} onOpenChange={setEditOpen} onSaved={(m) => notify(m)} />

      <Dialog open={archiveOpen} onOpenChange={(open) => !pending && setArchiveOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-ink">Archive {batch.name}?</DialogTitle>
            <DialogDescription>
              The batch moves out of your active list. It isn&apos;t deleted, and you can restore it any time from the Archived filter.
            </DialogDescription>
          </DialogHeader>
          {archiveError && (
            <Alert variant="destructive">
              <AlertDescription>{archiveError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-button" disabled={pending} onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 rounded-button"
              disabled={pending}
              onClick={async () => {
                setArchiveError(null);
                const error = await run(() => setBatchStatusAction(batch.id, "archived"), `${batch.name} was archived.`, true);
                if (error) setArchiveError(error);
                else setArchiveOpen(false);
              }}
            >
              {pending ? "Archiving…" : "Archive batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}
