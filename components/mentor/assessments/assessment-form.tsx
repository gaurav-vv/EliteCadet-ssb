"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAssessmentAction, updateAssessmentAction } from "@/lib/actions/assessments";
import { CONTENT_CATEGORIES } from "@/types/content";
import type { AssessmentInput } from "@/types/assessments";

type Errors = Partial<Record<keyof AssessmentInput, string>>;

// Create or edit (draft only) an assessment for one of the mentor's batches.
export function AssessmentForm({ batches, assessmentId, initial }: { batches: { id: string; name: string }[]; assessmentId?: string; initial?: AssessmentInput }) {
  const router = useRouter();
  const [values, setValues] = useState<AssessmentInput>(initial ?? { batchId: batches[0]?.id ?? "", title: "", instructions: "", category: "psychology", questions: [""], maxScore: "10", dueDate: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const err = (key: keyof AssessmentInput) => (errors[key] ? <p role="alert" className="text-[12px] text-(--academy-danger-text)">{errors[key]}</p> : null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = assessmentId ? await updateAssessmentAction(assessmentId, values) : await createAssessmentAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.error?.message ?? "We couldn't save the assessment. Please try again." });
        return;
      }
      setErrors({});
      if (!assessmentId && result.data && "id" in result.data) {
        router.push(`/mentor/assessments/${result.data.id}`);
        return;
      }
      setMessage({ tone: "success", text: "Saved." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  if (batches.length === 0) return <p className="glass-regular rounded-card px-6 py-6 text-sm text-ink-secondary">You&apos;re not assigned to a batch yet. You can create assessments once your academy admin assigns you one.</p>;

  return (
    <form onSubmit={submit} noValidate className="glass-regular flex flex-col gap-5 rounded-card px-6 py-6">
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-batch">Batch</Label>
          <Select value={values.batchId} onValueChange={(v) => set("batchId", v)} disabled={pending || Boolean(assessmentId)}>
            <SelectTrigger id="a-batch" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          {err("batchId")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-title">Title</Label>
          <Input id="a-title" className="min-h-11" value={values.title} onChange={(e) => set("title", e.target.value)} disabled={pending} aria-invalid={Boolean(errors.title)} />
          {err("title")}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="a-instructions">Instructions (optional)</Label>
        <Textarea id="a-instructions" rows={3} value={values.instructions} onChange={(e) => set("instructions", e.target.value)} disabled={pending} />
        {err("instructions")}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-category">Category</Label>
          <Select value={values.category} onValueChange={(v) => set("category", v)} disabled={pending}>
            <SelectTrigger id="a-category" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CONTENT_CATEGORIES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          {err("category")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-max">Maximum score</Label>
          <Input id="a-max" inputMode="numeric" className="min-h-11" value={values.maxScore} onChange={(e) => set("maxScore", e.target.value)} disabled={pending} aria-invalid={Boolean(errors.maxScore)} />
          {err("maxScore")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-due">Due date (optional, IST)</Label>
          <Input id="a-due" type="date" className="min-h-11" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} disabled={pending} aria-invalid={Boolean(errors.dueDate)} />
          {err("dueDate")}
        </div>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Questions</legend>
        {values.questions.map((q, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor={`a-q${i}`} className="text-[12px] text-ink-secondary">Question {i + 1}</Label>
              <Textarea id={`a-q${i}`} rows={2} value={q} onChange={(e) => set("questions", values.questions.map((x, j) => (j === i ? e.target.value : x)))} disabled={pending} />
            </div>
            {values.questions.length > 1 && (
              <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => set("questions", values.questions.filter((_, j) => j !== i))} disabled={pending} className="row-action mt-6 flex size-11 items-center justify-center rounded-pill text-ink-secondary">
                <X aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        ))}
        {values.questions.length < 20 && (
          <Button type="button" variant="outline" className="min-h-11 w-fit gap-1.5" onClick={() => set("questions", [...values.questions, ""])} disabled={pending}>
            <Plus aria-hidden="true" size={16} />
            Add question
          </Button>
        )}
        {err("questions")}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Saving…" : assessmentId ? "Save changes" : "Save as draft"}</Button>
      </div>
    </form>
  );
}
