"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveFeedbackAction } from "@/lib/actions/assessments";
import type { FeedbackInput } from "@/types/assessments";

type Errors = Partial<Record<keyof FeedbackInput, string>>;

// Save a draft review (kept server-side, so it's recoverable) or submit it.
// Submitting is final: the student then sees it and it's locked.
export function FeedbackForm({ attemptId, maxScore, initial }: { attemptId: string; maxScore: number; initial: FeedbackInput }) {
  const router = useRouter();
  const [values, setValues] = useState<FeedbackInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const set = (key: keyof FeedbackInput) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const err = (key: keyof FeedbackInput) => (errors[key] ? <p role="alert" className="text-[12px] text-(--academy-danger-text)">{errors[key]}</p> : null);

  async function save(final: boolean) {
    setPending(true);
    setMessage(null);
    try {
      const result = await saveFeedbackAction(attemptId, values, final);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.error?.message ?? "We couldn't save your feedback. Please try again." });
        setConfirmOpen(false);
        return;
      }
      setErrors({});
      setConfirmOpen(false);
      setMessage({ tone: "success", text: final ? "Review submitted. The student can see it now." : "Draft saved. Only staff can see it until you submit." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
      <h2 className="text-[18px] font-bold text-ink">Your evaluation</h2>
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex max-w-[200px] flex-col gap-1.5">
        <Label htmlFor="f-score">Score (out of {maxScore})</Label>
        <Input id="f-score" inputMode="decimal" className="min-h-11" value={values.score} onChange={(e) => set("score")(e.target.value)} disabled={pending} aria-invalid={Boolean(errors.score)} />
        {err("score")}
      </div>
      {(["strengths", "improvementAreas", "comments"] as const).map((key) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label htmlFor={`f-${key}`}>{key === "strengths" ? "Strengths" : key === "improvementAreas" ? "Areas to improve" : "Comments (optional)"}</Label>
          <Textarea id={`f-${key}`} rows={3} value={values[key]} onChange={(e) => set(key)(e.target.value)} disabled={pending} aria-invalid={Boolean(errors[key])} />
          {err(key)}
        </div>
      ))}
      <p className="text-[12px] text-ink-secondary">Focus on specific, actionable guidance for this answer. Never predict SSB selection.</p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => save(false)} disabled={pending}>{pending ? "Saving…" : "Save draft"}</Button>
        <Dialog open={confirmOpen} onOpenChange={(o) => !pending && setConfirmOpen(o)}>
          <DialogTrigger asChild>
            <Button type="button" className="min-h-11" disabled={pending}>Submit review</Button>
          </DialogTrigger>
          <DialogContent className="rounded-panel sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Submit this review?</DialogTitle>
              <DialogDescription>The student will see your score and feedback, and it can&apos;t be edited afterwards.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setConfirmOpen(false)} disabled={pending}>Keep editing</Button>
              <Button type="button" className="min-h-11" onClick={() => save(true)} disabled={pending}>{pending ? "Submitting…" : "Submit review"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </form>
  );
}
