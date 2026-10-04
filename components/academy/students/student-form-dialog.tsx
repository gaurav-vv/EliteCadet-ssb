"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Toast } from "@/components/academy/shared/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStudentAction, updateStudentAction } from "@/lib/actions/students";
import { STUDENT_NAME_MAX, validateStudentInput, type StudentFieldErrors } from "@/lib/academy/student-validation";
import type { StudentBatchOption, StudentRecord, StudentStatus } from "@/types/academy";

const TOAST_MS = 5000;

// Active batches can receive students; a student's current batch is always
// listed (marked if archived) so editing never silently drops it.
function selectableBatches(batches: StudentBatchOption[], currentId: string | null | undefined) {
  return batches
    .filter((b) => b.status === "active" || b.id === currentId)
    .map((b) => ({ id: b.id, label: b.status === "archived" ? `${b.name} (archived)` : b.name }));
}

interface StudentFormProps {
  student?: StudentRecord;
  batches: StudentBatchOption[];
  onCancel: () => void;
  onSaved: (message: string) => void;
}

// Mounted only while the dialog is open, so its state always starts from the
// student's current values (edit) or empty (add) — no reset logic needed.
function StudentForm({ student, batches, onCancel, onSaved }: StudentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(student);
  const [fullName, setFullName] = useState(student?.fullName ?? "");
  const [batchId, setBatchId] = useState(student?.batchId ?? "none");
  const [status, setStatus] = useState<StudentStatus>(student?.status ?? "active");
  const [errors, setErrors] = useState<StudentFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false); // blocks a double-click before state updates

  const options = selectableBatches(batches, student?.batchId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;

    const input = { fullName, batchId: batchId === "none" ? null : batchId, status };
    const parsed = validateStudentInput(input);
    setFormError(null);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});

    submitting.current = true;
    setSaving(true);
    try {
      const result = isEdit && student ? await updateStudentAction(student.id, parsed.value) : await createStudentAction(parsed.value);
      if (!result.ok) {
        setErrors(result.error?.fieldErrors ?? {});
        setFormError(result.error?.fieldErrors ? null : (result.error?.message ?? "We couldn't save this student. Please try again."));
        return;
      }
      // Only now — after Postgres confirmed the write — do we claim success.
      onSaved(isEdit ? `${parsed.value.fullName} was updated.` : `${parsed.value.fullName} was added.`);
      router.refresh();
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-[18px] font-semibold text-ink">{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the student's name, batch or status." : "Add a student to your academy. You can assign a batch now or later."}
        </DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="student-name">Full name</Label>
        <Input
          id="student-name"
          autoComplete="off"
          maxLength={STUDENT_NAME_MAX + 20}
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          disabled={saving}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? "student-name-error" : undefined}
          className="h-11"
        />
        {errors.fullName && (
          <p id="student-name-error" role="alert" className="text-[12px] text-(--academy-danger-text)">
            {errors.fullName}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="student-batch">Batch (optional)</Label>
        <Select value={batchId} onValueChange={setBatchId} disabled={saving}>
          <SelectTrigger id="student-batch" className="h-11 w-full" aria-invalid={errors.batchId ? true : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No batch</SelectItem>
            {options.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.batchId && (
          <p role="alert" className="text-[12px] text-(--academy-danger-text)">
            {errors.batchId}
          </p>
        )}
        {options.length === 0 && <p className="text-[12px] text-ink-secondary">No active batches yet. Create one from the Batches page.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="student-status">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as StudentStatus)} disabled={saving}>
          <SelectTrigger id="student-status" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p role="alert" className="text-[12px] text-(--academy-danger-text)">
            {errors.status}
          </p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-button" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 rounded-button" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add Student"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface AddStudentDialogProps {
  batches: StudentBatchOption[];
  // "primary" is the page-header button; "inline" is the secondary button used in empty states.
  variant?: "primary" | "inline";
}

// "+ Add Student" button that opens the form in a dialog.
export function AddStudentDialog({ batches, variant = "primary" }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function saved(message: string) {
    setOpen(false);
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={variant === "primary" ? "default" : "outline"}
            size="lg"
            className={variant === "primary" ? "h-11 rounded-button px-5 shadow-glow-accent" : "h-11 rounded-button px-5"}
          >
            <Plus aria-hidden="true" />
            Add Student
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <StudentForm batches={batches} onCancel={() => setOpen(false)} onSaved={saved} />
        </DialogContent>
      </Dialog>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

interface EditStudentDialogProps {
  student: StudentRecord;
  batches: StudentBatchOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}

// Controlled by the row's actions menu and the detail page.
export function EditStudentDialog({ student, batches, open, onOpenChange, onSaved }: EditStudentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <StudentForm
          student={student}
          batches={batches}
          onCancel={() => onOpenChange(false)}
          onSaved={(message) => {
            onOpenChange(false);
            onSaved(message);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
