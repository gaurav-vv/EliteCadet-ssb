"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Toast } from "@/components/academy/shared/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { removeAcademyStudentAction } from "@/lib/actions/academy-people";
import { setStudentBatchAction } from "@/lib/actions/batches";
import type { AcademyStudentRecord } from "@/types/academy-people";

const TOAST_MS = 4000;

// Real actions only: open, change batch (one batch per student), remove from
// the academy (account and history kept), each re-checked on the server.
export function StudentRowActions({ student, batches }: { student: AcademyStudentRecord; batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const name = student.fullName || student.email || "this student";
  const [pending, setPending] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string): Promise<string | null> {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) return result.error?.message ?? "That didn't work. Please try again.";
      notify(success, "success");
      router.refresh();
      return null;
    } catch {
      return "We couldn't reach the server. Please try again.";
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${name}`}
            disabled={pending}
            className="inline-flex size-11 items-center justify-center rounded-button text-ink-secondary transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-50 md:size-9"
          >
            <MoreHorizontal aria-hidden="true" size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem asChild>
            <Link href={`/academy/students/${student.id}`}>View student</Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change batch</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={student.batchId ?? "none"}
                onValueChange={async (value) => {
                  const next = value === "none" ? null : value;
                  const label = next ? (batches.find((b) => b.id === next)?.name ?? "the batch") : "no batch";
                  const error = await run(() => setStudentBatchAction(student.id, next), `${name} is now in ${label}.`);
                  if (error) notify(error, "error");
                }}
              >
                <DropdownMenuRadioItem value="none">No batch</DropdownMenuRadioItem>
                {batches.map((batch) => (
                  <DropdownMenuRadioItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setRemoveError(null);
              setRemoveOpen(true);
            }}
          >
            Remove from academy
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={removeOpen} onOpenChange={(open) => !pending && setRemoveOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {name} from your academy?</DialogTitle>
            <DialogDescription>They leave their batch and your academy. Their account and history are kept, and you can add them again later.</DialogDescription>
          </DialogHeader>
          {removeError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{removeError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-button" disabled={pending} onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 rounded-button"
              disabled={pending}
              onClick={async () => {
                const error = await run(() => removeAcademyStudentAction(student.id), `${name} was removed from your academy.`);
                if (error) setRemoveError(error);
                else setRemoveOpen(false);
              }}
            >
              {pending ? "Removing…" : "Remove student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}
