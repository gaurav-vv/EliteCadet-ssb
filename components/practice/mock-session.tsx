"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CarouselRunner } from "@/components/practice/carousel-runner";
import { QuestionGuidance } from "@/components/practice/question-guidance";
import { SelfReviewChecklist } from "@/components/practice/self-review-checklist";
import { MOCK_SESSIONS } from "@/lib/practice/config";
import { pickMockQuestions } from "@/lib/practice/mock-questions";
import { buildPiqQuestions } from "@/lib/practice/piq-questions";
import { readPiq } from "@/lib/student/piq-storage";
import { saveMockReviewAction, submitAttemptAction } from "@/lib/actions/practice";
import type { MockAttemptRecord } from "@/types/practice";
import type { GuidedPracticeItem } from "@/types/ssb-journey";

export type MockKind = "interview" | "conference";

interface MockSessionProps {
  kind: MockKind;
  /** The practice bank (0014) the general questions come from. */
  slug: string;
  /** The student's latest saved run, read on the server. */
  initialLast: MockAttemptRecord | null;
  title: string;
  intro: string;
  tips: string[];
  questions: GuidedPracticeItem[];
  selfReview: string[];
  backHref: string;
  backLabel: string;
}

type Phase = "instructions" | "running" | "review";

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

const newKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Timed mock interview / conference (specs.md §6.4b): one question at a time
// on the shared CarouselRunner, then a review screen. Each run and its
// self-review ticks are saved to the student's account (0014); a failed save
// keeps the answers on screen with a retry.
export function MockSession({ kind, slug, initialLast, title, intro, tips, questions, selfReview, backHref, backLabel }: MockSessionProps) {
  const config = MOCK_SESSIONS[kind];
  const [phase, setPhase] = useState<Phase>("instructions");
  const [runQuestions, setRunQuestions] = useState<GuidedPracticeItem[]>([]);
  const [attempt, setAttempt] = useState<MockAttemptRecord | null>(null);
  const [lastAttempt, setLastAttempt] = useState<MockAttemptRecord | null>(initialLast);
  const [runKey, setRunKey] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLeavePageGuard(phase === "running");

  function start() {
    const piq = kind === "interview" ? buildPiqQuestions(readPiq() ?? {}) : [];
    setRunQuestions(pickMockQuestions(config, questions, piq));
    setRunKey(newKey());
    setSaveError(null);
    setPhase("running");
  }

  async function save(run: MockAttemptRecord) {
    setSaving(true);
    const bankIds = new Set(questions.map((q) => q.id));
    const result = await submitAttemptAction(
      slug,
      "mock",
      runKey,
      run.questions.map((q) => (bankIds.has(q.id) ? { key: q.id, response: run.answers[q.id] ?? "" } : { prompt: q.prompt, response: run.answers[q.id] ?? "" })),
    );
    setSaving(false);
    if (!result.ok || !result.data) {
      setSaveError(result.error?.message ?? "We couldn't save this run. Your answers are still here.");
      return;
    }
    const saved = { ...run, id: result.data.id, completedAt: result.data.submittedAt };
    setSaveError(null);
    setAttempt(saved);
    setLastAttempt(saved);
  }

  function finish(answers: Record<string, string>) {
    const run: MockAttemptRecord = { id: "", completedAt: new Date().toISOString(), questions: runQuestions, answers, selfReview: {} };
    setAttempt(run);
    setPhase("review");
    void save(run);
  }

  function updateSelfReview(questionId: string, checked: string[]) {
    if (!attempt) return;
    const next = { ...attempt, selfReview: { ...attempt.selfReview, [questionId]: checked } };
    setAttempt(next);
    setLastAttempt(next);
    if (next.id) void saveMockReviewAction(next.id, next.selfReview);
  }

  if (phase === "running") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10">
        <CarouselRunner
          items={runQuestions}
          timing={{ mode: "carousel", responseSeconds: config.secondsPerQuestion }}
          onDone={finish}
          allowEarlyAdvance
        />
      </div>
    );
  }

  if (phase === "review" && attempt) {
    const answered = attempt.questions.filter((q) => attempt.answers[q.id]?.trim()).length;
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-10">
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <div>
          <h1 className="text-[28px] font-bold text-ink">{title}: review</h1>
          <p className="text-[14px] text-ink-secondary">
            You answered {answered} of {attempt.questions.length} questions. Read each answer against its guidance and
            tick your self-review. {attempt.id ? "Saved to your account; your mentor can read it." : saving ? "Saving…" : ""}
          </p>
        </div>
        {saveError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
            <span>{saveError}</span>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void save(attempt)}>
              Retry save
            </Button>
          </div>
        )}
        <ol className="flex flex-col gap-4">
          {attempt.questions.map((q, i) => {
            const answer = attempt.answers[q.id]?.trim();
            return (
              <li key={q.id} className="glass-regular flex flex-col gap-3 px-6 py-5">
                <h2 className="text-[15px] font-semibold text-ink">
                  {i + 1}. {q.prompt}
                </h2>
                {answer ? (
                  <p className="text-sm whitespace-pre-wrap text-ink">{answer}</p>
                ) : (
                  <p className="text-sm text-ink-secondary italic">No answer</p>
                )}
                {q.guidance && <QuestionGuidance guidance={q.guidance} />}
                {selfReview.length > 0 && (
                  <SelfReviewChecklist
                    items={selfReview}
                    checked={attempt.selfReview[q.id] ?? []}
                    onChange={(checked) => updateSelfReview(q.id, checked)}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setPhase("instructions")}>
            Try another {title.toLowerCase()}
          </Button>
          <Button asChild variant="outline">
            <Link href={backHref}>Back to {backLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const questionCount = Math.min(config.questionCount, questions.length);
  const minutes = Math.round((config.secondsPerQuestion / 60) * 10) / 10;

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-6 py-10">
      <div>
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <h1 className="mt-1 text-[28px] font-bold text-ink">{title}</h1>
      </div>
      <div className="glass-regular flex flex-col gap-3 px-6 py-6">
        <p className="text-sm text-ink">{intro}</p>
        <ul className="flex flex-col gap-1.5 text-sm text-ink-secondary">
          <li>
            {questionCount} questions, {minutes} {minutes === 1 ? "minute" : "minutes"} each. This is practice pacing, not
            an official SSB timing.
          </li>
          <li>Press Next question when you&apos;re done, or the next one opens when the timer runs out.</li>
          {kind === "interview" && (
            <li>
              Up to {config.maxPiqQuestions} questions come from{" "}
              <Link href="/student/practice/interview/piq" className="text-brand-accent hover:underline">
                your PIQ
              </Link>
              , if you&apos;ve filled it in.
            </li>
          )}
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={start}>
          Start {title.toLowerCase()}
        </Button>
        {lastAttempt && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAttempt(lastAttempt);
              setPhase("review");
            }}
          >
            Review last attempt
          </Button>
        )}
      </div>
    </div>
  );
}
