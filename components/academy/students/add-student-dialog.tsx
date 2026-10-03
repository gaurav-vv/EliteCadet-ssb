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
import { addStudentAction } from "@/lib/actions/academy";

const NAME_MIN = 2;
const NAME_MAX = 80;
const TOAST_MS = 5000;

interface AddStudentDialogProps {
  batches: { id: string; name: string }[];
  // "primary" is the page-header button; "inline" is the secondary button used in empty states.
  variant?: "primary" | "inline";
}

// Only the fields the backend can store today: name and batch. A student's
// mentor comes from their batch, and new students start Active.
export function AddStudentDialog({ batches, variant = "primary" }: AddStudentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [batchId, setBatchId] = useState("none");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function reset() {
    setFullName("");
    setBatchId("none");
    setNameError(null);
    setFormError(null);
  }

  function handleOpenChange(next: boolean) {
    if (saving) return; // don't lose an in-flight save by closing
    setOpen(next);
    if (!next) reset();
  }

  function validate(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed.length < NAME_MIN) return `Enter the student's full name (at least ${NAME_MIN} characters).`;
    if (trimmed.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer.`;
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const error = validate(fullName);
    setNameError(error);
    setFormError(null);
    if (error) return;

    setSaving(true);
    try {
      const result = await addStudentAction({ fullName, batchId: batchId === "none" ? null : batchId });
      if (!result.ok) {
        setFormError(result.error?.message ?? "We couldn't add this student. Please try again.");
        return;
      }
      setOpen(false);
      reset();
      setToast(`${result.data?.fullName ?? "Student"} was added.`);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), TOAST_MS);
      router.refresh();
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {variant === "primary" ? (
            <Button size="lg" className="h-11 rounded-button px-5 shadow-glow-accent">
              <Plus aria-hidden="true" />
              Add Student
            </Button>
          ) : (
            <Button variant="outline" size="lg" className="h-11 rounded-button px-5">
              <Plus aria-hidden="true" />
              Add Student
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-ink">Add Student</DialogTitle>
              <DialogDescription>New students start as Active. Their mentor is set by the batch you choose.</DialogDescription>
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
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                disabled={saving}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "student-name-error" : undefined}
                className="h-11"
              />
              {nameError && (
                <p id="student-name-error" role="alert" className="text-[12px] text-(--academy-danger-text)">
                  {nameError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-batch">Batch (optional)</Label>
              <Select value={batchId} onValueChange={setBatchId} disabled={saving}>
                <SelectTrigger id="student-batch" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No batch — assign later</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-button" disabled={saving} onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-button" disabled={saving}>
                {saving ? "Adding…" : "Add Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
