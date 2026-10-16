"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { readPiqAnswers, savePiqAnswer } from "@/lib/student/piq-answers";
import { PIQ_FIELDS, PIQ_MAX_LENGTH, buildPiqQuestions, validatePiq, type PiqInput } from "@/lib/practice/piq-questions";
import { readPiq, writePiq } from "@/lib/student/piq-storage";

interface PiqInterviewProps {
  selfReview: string[];
}

// PIQ form → template-generated interview questions (specs.md §6.4b). The
// saved PIQ lives in localStorage, so it's read after mount (same
// hydration-safe pattern as bank-practice-runner.tsx).
export function PiqInterview({ selfReview }: PiqInterviewProps) {
  const [loaded, setLoaded] = useState(false);
  const [piq, setPiq] = useState<PiqInput | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PiqInput>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readPiq();
    /* eslint-disable react-hooks/set-state-in-effect -- hydration-safe external-store (localStorage) read, not derived state */
    setPiq(saved);
    setDraft(saved ?? {});
    setEditing(!saved);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validatePiq(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPiq(writePiq(draft));
    setEditing(false);
  }

  function handleCancel() {
    setDraft(piq ?? {});
    setError(null);
    setEditing(false);
  }

  if (!loaded) return <LoadingState message="Loading your PIQ…" />;

  if (editing || !piq) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-10">
        <Link href="/student/practice/interview" className="text-xs text-brand-accent hover:underline">
          ← Interview
        </Link>
        <div>
          <h1 className="text-[28px] font-bold text-ink">My PIQ questions</h1>
          <p className="mt-1 text-[14px] text-ink-secondary">
            Fill in what you wrote, or plan to write, in your PIQ form. You&apos;ll get interview questions built from
            your own answers. Every field is optional. It&apos;s stored on this device only.
          </p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="glass-regular flex flex-col gap-4 px-6 py-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {PIQ_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`piq-${field.key}`}>{field.label}</Label>
              <Input
                id={`piq-${field.key}`}
                maxLength={PIQ_MAX_LENGTH}
                placeholder={field.placeholder}
                value={draft[field.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Get my questions</Button>
            {piq && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    );
  }

  const questions = buildPiqQuestions(piq);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ink">My PIQ questions</h1>
          <p className="text-[14px] text-ink-secondary">{questions.length} questions built from your PIQ.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit PIQ
        </Button>
      </div>
      <BankPracticeRunner
        key={questions.map((q) => q.id).join(",")}
        slug="interview"
        initialAnswers={readPiqAnswers()}
        onSave={async (id, patch) => savePiqAnswer(id, patch)}
        saveNote="Answers to your PIQ questions are saved on this device, like your PIQ form."
        backHref="/student/practice/interview"
        backLabel="Interview"
        responseItems={questions}
        selfReview={selfReview}
      />
    </div>
  );
}
