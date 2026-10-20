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
import { addAcademyStudentAction } from "@/lib/actions/academy-people";

const TOAST_MS = 5000;

// Add by email: an existing student account (with no academy) joins yours;
// anyone without an account gets an email invite (their name is needed then).
export function AddStudentDialog({ variant = "primary" }: { variant?: "primary" | "inline" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [fieldError, setFieldError] = useState<{ field: "email" | "fullName"; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function reset() {
    setEmail("");
    setFullName("");
    setFieldError(null);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldError(null);
    setFormError(null);
    try {
      const result = await addAcademyStudentAction({ email, fullName });
      if (!result.ok) {
        if (result.field) setFieldError({ field: result.field, message: result.error?.message ?? "Please check this field." });
        else setFormError(result.error?.message ?? "We couldn't add the student. Please try again.");
        return;
      }
      setOpen(false);
      reset();
      setToast(result.data?.invited ? `Invite sent to ${result.data.name}.` : `${result.data?.name ?? "The student"} joined your academy.`);
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
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (saving) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant={variant === "primary" ? "default" : "outline"} className="h-11 gap-1.5 rounded-button">
            <Plus aria-hidden="true" />
            Add student
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
            <DialogDescription>Enter their email. If they don&apos;t have an account yet, add their name and we&apos;ll email them an invite.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-email">Email</Label>
              <Input
                id="student-email"
                type="email"
                autoComplete="off"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldError?.field === "email" ? true : undefined}
                aria-describedby={fieldError?.field === "email" ? "student-email-error" : undefined}
                disabled={saving}
              />
              {fieldError?.field === "email" && (
                <p id="student-email-error" role="alert" className="text-[12px] text-(--academy-danger-text)">
                  {fieldError.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-name">Full name (needed for an invite)</Label>
              <Input
                id="student-name"
                className="h-11"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-invalid={fieldError?.field === "fullName" ? true : undefined}
                aria-describedby={fieldError?.field === "fullName" ? "student-name-error" : undefined}
                disabled={saving}
              />
              {fieldError?.field === "fullName" && (
                <p id="student-name-error" role="alert" className="text-[12px] text-(--academy-danger-text)">
                  {fieldError.message}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-button" disabled={saving} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-button" disabled={saving || !email.trim()}>
                {saving ? "Adding…" : "Add student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />}
    </>
  );
}
