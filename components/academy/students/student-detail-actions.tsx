"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { EditStudentDialog } from "@/components/academy/students/student-form-dialog";
import { Toast } from "@/components/academy/shared/toast";
import { Button } from "@/components/ui/button";
import type { StudentBatchOption, StudentRecord } from "@/types/academy";

const TOAST_MS = 4000;

// The detail page's one action: edit the student (same dialog as the list).
export function StudentDetailActions({ student, batches }: { student: StudentRecord; batches: StudentBatchOption[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function saved(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  return (
    <>
      <Button type="button" size="lg" className="h-11 rounded-button px-5 shadow-glow-accent" onClick={() => setOpen(true)}>
        <Pencil aria-hidden="true" />
        Edit student
      </Button>
      <EditStudentDialog student={student} batches={batches} open={open} onOpenChange={setOpen} onSaved={saved} />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
