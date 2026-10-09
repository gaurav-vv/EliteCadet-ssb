"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAcademyAction, updateAcademyAction } from "@/lib/actions/academies";
import type { AcademyInput, AcademyRecord } from "@/types/academies";

type FieldErrors = Partial<Record<keyof AcademyInput, string>>;

interface AcademyFormDialogProps {
  // Omit to create; pass to edit.
  academy?: AcademyRecord;
}

const EMPTY: AcademyInput = { name: "", description: "", logoUrl: "", contactEmail: "", contactPhone: "" };

function toInput(a?: AcademyRecord): AcademyInput {
  if (!a) return EMPTY;
  return { name: a.name, description: a.description ?? "", logoUrl: a.logoUrl ?? "", contactEmail: a.contactEmail ?? "", contactPhone: a.contactPhone ?? "" };
}

const FIELDS: { key: keyof AcademyInput; label: string; type?: string; hint?: string }[] = [
  { key: "name", label: "Academy name" },
  { key: "contactEmail", label: "Contact email (optional)", type: "email" },
  { key: "contactPhone", label: "Contact phone (optional)", type: "tel" },
  { key: "logoUrl", label: "Logo link (optional)", type: "url", hint: "An https:// image link. File upload comes later." },
];

export function AcademyFormDialog({ academy }: AcademyFormDialogProps) {
  const router = useRouter();
  const editing = Boolean(academy);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AcademyInput>(toInput(academy));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = academy ? await updateAcademyAction(academy.id, values) : await createAcademyAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setOpen(false);
      if (!academy && result.data && "id" in result.data) router.push(`/admin/academies/${result.data.id}`);
      else router.refresh();
    } catch {
      setMessage("We couldn't reach the server. Check your connection and try again.");
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
        if (next) {
          setValues(toInput(academy));
          setErrors({});
          setMessage(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={editing ? "outline" : "default"} className="min-h-11">
          {editing ? "Edit details" : "Create academy"}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-panel sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit academy" : "Create academy"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this academy's details." : "Add a new academy. You can add its admins, mentors and students next."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {message && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`academy-${f.key}`}>{f.label}</Label>
              <Input
                id={`academy-${f.key}`}
                type={f.type ?? "text"}
                className="min-h-11"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                aria-invalid={Boolean(errors[f.key])}
                aria-describedby={errors[f.key] ? `academy-${f.key}-error` : undefined}
                disabled={pending}
              />
              {f.hint && !errors[f.key] && <p className="text-[12px] text-ink-secondary">{f.hint}</p>}
              {errors[f.key] && (
                <p id={`academy-${f.key}-error`} className="text-[12px] text-(--academy-danger-text)">
                  {errors[f.key]}
                </p>
              )}
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="academy-description">Description (optional)</Label>
            <Textarea
              id="academy-description"
              rows={3}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              aria-invalid={Boolean(errors.description)}
              disabled={pending}
            />
            {errors.description && <p className="text-[12px] text-(--academy-danger-text)">{errors.description}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create academy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
