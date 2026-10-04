"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { EditStudentDialog } from "@/components/academy/students/student-form-dialog";
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
import { setStudentBatchAction, setStudentStatusAction, type StudentActionResult } from "@/lib/actions/students";
import type { StudentBatchOption, StudentRecord } from "@/types/academy";

const TOAST_MS = 4000;

interface StudentRowActionsProps {
  student: StudentRecord;
  batches: StudentBatchOption[];
}

// Every item is wired to a real mutation: view, edit, change batch, set status.
// (No delete: students are marked inactive so their history can never be orphaned.)
export function StudentRowActions({ student, batches }: StudentRowActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function notify(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function run(action: () => Promise<StudentActionResult>, success: string) {
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
      notify(message, "error");
      return;
    }
    notify(success);
    router.refresh();
  }

  const inactive = student.status === "inactive";
  const assignable = batches.filter((b) => b.status === "active" || b.id === student.batchId);

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
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit student</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change batch</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={student.batchId ?? "none"}
                onValueChange={(value) => {
                  const next = value === "none" ? null : value;
                  const label = next ? (batches.find((b) => b.id === next)?.name ?? "the batch") : "No batch";
                  void run(() => setStudentBatchAction(student.id, next), `${student.fullName} moved to ${label}.`);
                }}
              >
                <DropdownMenuRadioItem value="none">No batch</DropdownMenuRadioItem>
                {assignable.map((b) => (
                  <DropdownMenuRadioItem key={b.id} value={b.id}>
                    {b.status === "archived" ? `${b.name} (archived)` : b.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              void run(
                () => setStudentStatusAction(student.id, inactive ? "active" : "inactive"),
                `${student.fullName} marked ${inactive ? "active" : "inactive"}.`,
              )
            }
          >
            {inactive ? "Mark active" : "Mark inactive"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditStudentDialog student={student} batches={batches} open={editOpen} onOpenChange={setEditOpen} onSaved={(m) => notify(m)} />
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}
