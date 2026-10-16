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
import { createBatchAction, updateBatchAction } from "@/lib/actions/batches";
import { BATCH_NAME_MAX, validateBatchInput, type BatchFieldErrors } from "@/lib/academy/batch-validation";
import type { BatchRecord } from "@/types/academy";

const TOAST_MS = 5000;

interface BatchFormProps {
  batch?: BatchRecord;
  onCancel: () => void;
  onSaved: (message: string) => void;
}

// Mounted only while the dialog is open, so its state always starts from the
// batch's current values (edit) or empty (create) — no reset logic needed.
function BatchForm({ batch, onCancel, onSaved }: BatchFormProps) {
  const router = useRouter();
  const isEdit = Boolean(batch);
  const [name, setName] = useState(batch?.name ?? "");
  const [startDate, setStartDate] = useState(batch?.startDate ?? "");
  const [errors, setErrors] = useState<BatchFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false); // blocks a double-click before state updates

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;

    const input = { name, startDate: startDate || null };
    const parsed = validateBatchInput(input);
    setFormError(null);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});

    submitting.current = true;
    setSaving(true);
    try {
      const result = isEdit && batch ? await updateBatchAction(batch.id, parsed.value) : await createBatchAction(parsed.value);
      if (!result.ok) {
        setErrors(result.error?.fieldErrors ?? {});
        setFormError(result.error?.fieldErrors ? null : (result.error?.message ?? "We couldn't save this batch. Please try again."));
        return;
      }
      // Only now — after Postgres confirmed the write — do we claim success.
      onSaved(isEdit ? `${parsed.value.name} was updated.` : `${parsed.value.name} was created.`);
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
        <DialogTitle className="text-[18px] font-semibold text-ink">{isEdit ? "Edit Batch" : "Create Batch"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the batch's name or start date." : "Add a batch, then assign its mentors and students from the batch page."}
        </DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="batch-name">Batch name</Label>
        <Input
          id="batch-name"
          autoComplete="off"
          maxLength={BATCH_NAME_MAX + 20}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          disabled={saving}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "batch-name-error" : undefined}
          className="h-11"
        />
        {errors.name && (
          <p id="batch-name-error" role="alert" className="text-[12px] text-(--academy-danger-text)">
            {errors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="batch-start">Start date (optional)</Label>
        <Input
          id="batch-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={saving}
          aria-invalid={errors.startDate ? true : undefined}
          aria-describedby={errors.startDate ? "batch-start-error" : undefined}
          className="h-11"
        />
        {errors.startDate && (
          <p id="batch-start-error" role="alert" className="text-[12px] text-(--academy-danger-text)">
            {errors.startDate}
          </p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-button" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 rounded-button" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create Batch"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface CreateBatchDialogProps {
  variant?: "primary" | "inline";
}

// "+ Create Batch" button that opens the form in a dialog.
export function CreateBatchDialog({ variant = "primary" }: CreateBatchDialogProps) {
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
          <Button variant={variant === "primary" ? "default" : "outline"} size="lg" className={variant === "primary" ? "h-11 rounded-button px-5 shadow-glow-accent" : "h-11 rounded-button px-5"}>
            <Plus aria-hidden="true" />
            Create Batch
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <BatchForm onCancel={() => setOpen(false)} onSaved={saved} />
        </DialogContent>
      </Dialog>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

interface EditBatchDialogProps {
  batch: BatchRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}

// Controlled by the row's actions menu.
export function EditBatchDialog({ batch, open, onOpenChange, onSaved }: EditBatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <BatchForm
          batch={batch}
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
