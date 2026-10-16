"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createItemAction, updateItemAction } from "@/lib/actions/practice";
import type { AdminPracticeItem, PracticeItemInput, PracticeItemKind } from "@/types/practice";

type Errors = Partial<Record<keyof PracticeItemInput, string>>;

function initial(item?: AdminPracticeItem): PracticeItemInput {
  const correct = item?.options?.findIndex((o) => o.id === item.correctOptionId) ?? -1;
  return {
    prompt: item?.prompt ?? "",
    options: item?.options?.map((o) => o.label).join("\n") ?? "",
    correct: correct >= 0 ? String(correct + 1) : "",
    assesses: item?.guidance?.assesses ?? "",
    tips: item?.guidance?.tips.join("\n") ?? "",
  };
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p id={`${id}-hint`} className="text-[12px] text-ink-secondary">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// Add (no `item`) or edit one question. The server re-validates everything
// and the database checks the item's shape again (0014).
export function PracticeItemForm({ slug, kind, item, onDone }: { slug: string; kind: PracticeItemKind; item?: AdminPracticeItem; onDone?: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<PracticeItemInput>(initial(item));
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const idp = item ? `item-${item.id}` : `new-${slug}`;
  const set = (k: keyof PracticeItemInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const aria = (k: keyof PracticeItemInput, hint = false) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": [hint ? `${idp}-${k}-hint` : "", errors[k] ? `${idp}-${k}-error` : ""].filter(Boolean).join(" ") || undefined,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = item ? await updateItemAction(slug, item.id, values) : await createItemAction(slug, values);
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage({ ok: false, text: result.error?.message ?? "We couldn't save that question. Please try again." });
      return;
    }
    setErrors({});
    setMessage({ ok: true, text: item ? "Question saved." : "Question added at the end of the bank." });
    if (!item) setValues(initial());
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id={`${idp}-prompt`} label={kind === "mcq" ? "Question" : "Prompt"} error={errors.prompt}>
        <Textarea id={`${idp}-prompt`} value={values.prompt} onChange={set("prompt")} className="min-h-20" {...aria("prompt")} />
      </Field>
      {kind === "mcq" ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field id={`${idp}-options`} label="Options" hint="2 to 6 options, one per line." error={errors.options}>
            <Textarea id={`${idp}-options`} value={values.options} onChange={set("options")} className="min-h-24" {...aria("options", true)} />
          </Field>
          <Field id={`${idp}-correct`} label="Correct option" hint="Its line number, e.g. 2." error={errors.correct}>
            <Input id={`${idp}-correct`} inputMode="numeric" value={values.correct} onChange={set("correct")} className="min-h-11" {...aria("correct", true)} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${idp}-assesses`} label="What it checks (optional)" hint="Shown to students as preparation guidance." error={errors.assesses}>
            <Input id={`${idp}-assesses`} value={values.assesses} onChange={set("assesses")} className="min-h-11" {...aria("assesses", true)} />
          </Field>
          <Field id={`${idp}-tips`} label="Tips (optional)" hint="One per line, up to 8." error={errors.tips}>
            <Textarea id={`${idp}-tips`} value={values.tips} onChange={set("tips")} className="min-h-20" {...aria("tips", true)} />
          </Field>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? "Saving…" : item ? "Save question" : "Add question"}
        </Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone} className="min-h-11">
            Cancel
          </Button>
        )}
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-[13px] text-ink" : "text-[13px] text-danger"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
