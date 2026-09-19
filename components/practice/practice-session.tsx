"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { CarouselRunner } from "@/components/practice/carousel-runner";
import { BudgetRunner } from "@/components/practice/budget-runner";
import { PRACTICE_TIMING } from "@/lib/practice/config";
import { submitPractice } from "@/lib/api/practice";
import type { PracticeActivitySummary, PracticeItem, PsychologyTestType } from "@/types/practice";

interface PracticeSessionProps {
  testType: PsychologyTestType;
  summary: PracticeActivitySummary;
  items: PracticeItem[];
}

type SessionPhase = "instructions" | "in_progress" | "submitting" | "submitted" | "error";

function useLeavePageGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}

export function PracticeSession({ testType, summary, items }: PracticeSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>("instructions");
  const [responses, setResponses] = useState<Record<string, string> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  useLeavePageGuard(phase === "in_progress" || phase === "submitting");

  async function handleDone(finalResponses: Record<string, string>) {
    setResponses(finalResponses);
    setPhase("submitting");
    setErrorMessage(null);

    const result = await submitPractice(
      {
        testType,
        responses: Object.entries(finalResponses).map(([itemId, response]) => ({ itemId, response })),
      },
      idempotencyKey,
    );

    if (!result.ok) {
      setPhase("error");
      setErrorMessage(result.error?.message ?? "We couldn't submit your practice. Please try again.");
      return;
    }

    setPhase("submitted");
  }

  function handleRetry() {
    if (responses) {
      void handleDone(responses);
    }
  }

  const timing = PRACTICE_TIMING[testType];

  if (phase === "instructions") {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-6 py-10">
        <div>
          <Link href="/student/practice/psychology" className="text-xs text-brand-navy hover:underline">
            ← Psychology
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">{summary.title}</h1>
        </div>
        <div className="glass-surface flex flex-col gap-3 px-6 py-6">
          <p className="text-sm text-text-primary">{summary.description}</p>
          <ul className="flex flex-col gap-1 text-sm text-text-muted">
            <li>{summary.itemCount} items</li>
            <li>{summary.durationLabel}</li>
            <li>Once started, the timer runs automatically — read the instructions fully before you begin.</li>
            <li>Leaving mid-activity will prompt a warning; your progress up to that point is not saved.</li>
          </ul>
        </div>
        <Button onClick={() => setPhase("in_progress")}>Start {summary.title.split(" —")[0]}</Button>
      </div>
    );
  }

  if (phase === "in_progress") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10">
        {timing.mode === "carousel" ? (
          <CarouselRunner items={items} timing={timing} onDone={handleDone} />
        ) : (
          <BudgetRunner items={items} totalSeconds={timing.totalSeconds} onDone={handleDone} />
        )}
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
        <p className="text-sm text-text-muted">Submitting your responses…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 py-10">
        <ErrorState message={errorMessage ?? undefined} onRetry={handleRetry} />
        <p className="text-center text-xs text-text-muted">
          Your responses are still here — retrying won&apos;t lose anything or create a duplicate submission.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="glass-surface flex flex-col items-center gap-3 px-8 py-10">
        <h1 className="text-xl font-semibold text-text-primary">Submitted</h1>
        <p className="text-sm text-text-muted">
          Your {summary.title.split(" —")[0]} responses were recorded. AI feedback isn&apos;t available yet
          (tracked as T034) — your mentor will be able to review this once mentor tools are built.
        </p>
        <Button asChild size="sm">
          <Link href="/student/practice/psychology">Back to Psychology</Link>
        </Button>
      </div>
    </div>
  );
}
