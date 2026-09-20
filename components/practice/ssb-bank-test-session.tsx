"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { CarouselRunner } from "@/components/practice/carousel-runner";
import { McqTestRunner } from "@/components/practice/mcq-test-runner";
import { submitSsbBankTest } from "@/lib/api/ssb-journey";
import type { CarouselTiming } from "@/lib/practice/config";
import type { McqItem, SsbBankItemKind } from "@/types/ssb-journey";
import type { PracticeItem } from "@/types/practice";

interface SsbBankTestSessionProps {
  title: string;
  description: string;
  context?: string;
  backHref: string;
  backLabel: string;
  itemKind: SsbBankItemKind;
  mcqItems?: McqItem[];
  responseItems?: PracticeItem[];
  carouselTiming?: CarouselTiming;
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

// The generic test-mode counterpart to components/practice/practice-session.tsx
// for bank modules that have no existing dedicated route to link out to
// (OIR/OIR Non-verbal Test — mcq; PPDT — response). Response-kind Day 2 tests
// (WAT/TAT/SRT/SDT) already have that dedicated flow and link there via
// `href` instead of using this component.
export function SsbBankTestSession({
  title,
  description,
  context,
  backHref,
  backLabel,
  itemKind,
  mcqItems,
  responseItems,
  carouselTiming,
}: SsbBankTestSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>("instructions");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAnswers, setLastAnswers] = useState<Record<string, string> | null>(null);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  useLeavePageGuard(phase === "in_progress" || phase === "submitting");

  const items = mcqItems ?? responseItems ?? [];
  const itemCount = items.length;

  async function handleDone(answers: Record<string, string>) {
    setLastAnswers(answers);
    setPhase("submitting");
    setErrorMessage(null);

    const result = await submitSsbBankTest(answers, idempotencyKey);
    if (!result.ok) {
      setPhase("error");
      setErrorMessage(result.error?.message ?? "We couldn't submit your test. Please try again.");
      return;
    }
    setPhase("submitted");
  }

  function handleRetry() {
    if (lastAnswers) void handleDone(lastAnswers);
  }

  if (phase === "instructions") {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-6 py-10">
        <div>
          <Link href={backHref} className="text-xs text-brand-accent hover:underline">
            ← {backLabel}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
        </div>
        <div className="glass-regular flex flex-col gap-3 px-6 py-6">
          <p className="text-sm text-ink">{description}</p>
          {context && <p className="text-sm text-ink-secondary">{context}</p>}
          <ul className="flex flex-col gap-1 text-sm text-ink-secondary">
            <li>{itemCount} {itemCount === 1 ? "item" : "items"}</li>
            <li>Once started, the timer runs automatically — read the instructions fully before you begin.</li>
            <li>Leaving mid-test will prompt a warning; your progress up to that point is not saved.</li>
          </ul>
        </div>
        <Button onClick={() => setPhase("in_progress")}>Start {title}</Button>
      </div>
    );
  }

  if (phase === "in_progress") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10">
        {itemKind === "mcq" ? (
          <McqTestRunner items={mcqItems ?? []} totalSeconds={Math.max(itemCount, 1) * 45} onDone={handleDone} />
        ) : (
          <CarouselRunner
            items={responseItems ?? []}
            timing={carouselTiming ?? { mode: "carousel", responseSeconds: 240 }}
            onDone={handleDone}
          />
        )}
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
        <p className="text-sm text-ink-secondary">Submitting your responses…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 py-10">
        <ErrorState message={errorMessage ?? undefined} onRetry={handleRetry} />
        <p className="text-center text-xs text-ink-secondary">
          Your responses are still here — retrying won&apos;t lose anything or create a duplicate submission.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10">
        <h1 className="text-xl font-semibold text-ink">Submitted</h1>
        <p className="text-sm text-ink-secondary">
          Your {title} responses were recorded. AI feedback isn&apos;t available yet (tracked as T034) —
          your mentor will be able to review this once mentor tools are built.
        </p>
        <Button asChild size="sm">
          <Link href={backHref}>Back to {backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
