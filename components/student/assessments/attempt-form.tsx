"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAttemptAction } from "@/lib/actions/assessments";
import type { AssessmentQuestion, AttemptAnswer } from "@/types/assessments";

// Answer an assessment: save a draft as often as you like (kept on the
// server, so nothing is lost), then submit once — after that it's locked.
export function AttemptForm({ assessmentId, questions, initial }: { assessmentId: string; questions: AssessmentQuestion[]; initial: AttemptAnswer[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(questions.map((q) => [q.id, initial.find((a) => a.questionId === q.id)?.answer ?? ""])));
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const unanswered = questions.filter((q) => !answers[q.id]?.trim()).length;

  async function save(submit: boolean) {
    setPending(true);
    setMessage(null);
    try {
      const result = await saveAttemptAction(assessmentId, questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" })), submit);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error?.message ?? "We couldn't save your answers. They're still here — please try again." });
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      setMessage({ tone: "success", text: submit ? "Submitted. Your mentor will review it." : "Draft saved." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Your answers are still here — please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-5">
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      {questions.map((q, i) => (
        <div key={q.id} className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
          <Label htmlFor={`ans-${q.id}`} className="text-[15px] font-medium text-ink">{i + 1}. {q.prompt}</Label>
          <Textarea id={`ans-${q.id}`} rows={5} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} disabled={pending} maxLength={5000} />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-[13px] text-ink-secondary">{unanswered === 0 ? "All questions answered" : `${unanswered} unanswered`}</span>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => save(false)} disabled={pending}>{pending ? "Saving…" : "Save draft"}</Button>
        <Dialog open={confirmOpen} onOpenChange={(o) => !pending && setConfirmOpen(o)}>
          <DialogTrigger asChild>
            <Button type="button" className="min-h-11" disabled={pending}>Submit</Button>
          </DialogTrigger>
          <DialogContent className="rounded-panel sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Submit your answers?</DialogTitle>
              <DialogDescription>{unanswered > 0 ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered. ` : ""}You can&apos;t change your answers after submitting.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setConfirmOpen(false)} disabled={pending}>Keep working</Button>
              <Button type="button" className="min-h-11" onClick={() => save(true)} disabled={pending}>{pending ? "Submitting…" : "Submit"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </form>
  );
}
