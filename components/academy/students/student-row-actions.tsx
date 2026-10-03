"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Toast } from "@/components/academy/shared/toast";
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
import { assignStudentBatchAction, setStudentStatusAction } from "@/lib/actions/academy";
import type { StudentRow } from "@/types/academy";

interface StudentRowActionsProps {
  student: StudentRow;
  batches: { id: string; name: string }[];
}

const TOAST_MS = 4000;

// Only actions the backend supports today: open the student, change their
// batch (their mentor follows the batch), and mark active/inactive.
export function StudentRowActions({ student, batches }: StudentRowActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        notify(result.error?.message ?? "That didn't work. Please try again.", "error");
        return;
      }
      notify(success, "success");
      router.refresh();
    } catch {
      notify("We couldn't reach the server. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  const markInactive = student.status !== "inactive";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${student.fullName}`}
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
                onValueChange={(value) => {
                  const next = value === "none" ? null : value;
                  const label = next ? (batches.find((b) => b.id === next)?.name ?? "the batch") : "No batch";
                  void run(() => assignStudentBatchAction(student.id, next), `${student.fullName} moved to ${label}.`);
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
            onSelect={() =>
              void run(
                () => setStudentStatusAction(student.id, markInactive ? "inactive" : "active"),
                `${student.fullName} marked ${markInactive ? "inactive" : "active"}.`,
              )
            }
          >
            {markInactive ? "Mark inactive" : "Mark active"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}
