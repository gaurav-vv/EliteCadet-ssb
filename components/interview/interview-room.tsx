"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { AiFeedbackView } from "@/components/practice/ai-feedback";
import { PendingRefresh } from "@/components/practice/pending-refresh";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCountdown } from "@/hooks/use-countdown";
import { answerTurnAction, skipWaitAction } from "@/lib/actions/interview";
import type { FollowUpType, InterviewTurn, InterviewView } from "@/types/interview";

const FOLLOW_UP: Record<FollowUpType, string> = {
  clarification: "Follow-up: asks you to make your last answer clearer",
  evidence: "Follow-up: asks for a real example",
  depth: "Follow-up: goes deeper into your last answer",
  consistency: "Follow-up: checks this fits what you said earlier",
  reflection: "Follow-up: asks what you learned",
};
const MOCK_SECONDS = 120;
const SKIP_AFTER_MS = 45_000;

function Timer({ onExpire }: { onExpire: () => void }) {
  const left = useCountdown(MOCK_SECONDS, onExpire);
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary">
      <Clock aria-hidden="true" size={14} />
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left
    </span>
  );
}

function Answering({ view, turn }: { view: InterviewView; turn: InterviewTurn }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(answer: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await answerTurnAction(view.id, turn.id, answer);
    setPending(false);
    if (result.ok) router.refresh();
    else setError(result.error?.message ?? "We couldn't save your answer. It's still here — please try again.");
  }

  const showWhy = view.mode === "guided" && turn.followUpType;
  return (
    <section aria-labelledby="current-question" className="glass-regular flex flex-col gap-4 rounded-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
          Question {turn.seq} of {view.maxQuestions}
        </span>
        {view.mode === "mock" && <Timer key={turn.id} onExpire={() => void submit(text)} />}
      </div>
      <h2 id="current-question" className="text-[18px] font-semibold text-ink">
        {turn.question}
      </h2>
      {showWhy && <p className="text-[13px] text-ink-secondary">{FOLLOW_UP[turn.followUpType!]}</p>}
      {view.mode === "guided" && turn.seq === 1 && <p className="text-[13px] text-ink-secondary">Tip: answer with something real you did, and keep it to a few sentences.</p>}
      <Textarea aria-label="Your answer" value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} className="min-h-32" placeholder="Type your answer…" />
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void submit(text)} disabled={pending || (view.mode !== "mock" && !text.trim())} className="min-h-11">
          {pending ? "Saving…" : turn.seq === view.maxQuestions ? "Finish interview" : "Answer"}
        </Button>
        <span className="text-[12px] text-ink-secondary">{text.length} / 3000</span>
      </div>
    </section>
  );
}

function Waiting({ view }: { view: InterviewView }) {
  const router = useRouter();
  const [canSkip, setCanSkip] = useState(false);
  const [pending, setPending] = useState(false);
  // After a while, offer to continue with a question from the bank instead.
  useEffect(() => {
    const waited = view.waitingSince ? Date.now() - Date.parse(view.waitingSince) : 0;
    const id = setTimeout(() => setCanSkip(true), Math.max(0, SKIP_AFTER_MS - waited));
    return () => clearTimeout(id);
  }, [view.waitingSince]);

  async function skip() {
    setPending(true);
    await skipWaitAction(view.id);
    setPending(false);
    router.refresh();
  }
  return (
    <div role="status" className="glass-regular flex flex-col items-start gap-3 rounded-card p-6">
      <PendingRefresh active intervalMs={2500} />
      <p className="text-sm text-ink">The interviewer is reading your answer and preparing the next question…</p>
      {canSkip && (
        <Button type="button" variant="outline" onClick={skip} disabled={pending} className="min-h-11">
          Skip to the next question
        </Button>
      )}
    </div>
  );
}

export function Transcript({ turns, showReasons }: { turns: InterviewTurn[]; showReasons: boolean }) {
  const done = turns.filter((t) => t.answeredAt);
  if (done.length === 0) return null;
  return (
    <ol className="flex flex-col gap-3" aria-label="Interview so far">
      {done.map((t) => (
        <li key={t.id} className="glass-regular flex flex-col gap-1 rounded-card px-5 py-4">
          <p className="text-[13px] text-ink-secondary">
            {t.seq}. {t.question}
          </p>
          {showReasons && t.followUpType && <p className="text-[12px] text-ink-secondary">{FOLLOW_UP[t.followUpType]}</p>}
          {t.answer?.trim() ? <p className="text-sm whitespace-pre-wrap text-ink">{t.answer}</p> : <p className="text-sm text-ink-secondary italic">No answer</p>}
        </li>
      ))}
    </ol>
  );
}

export function InterviewRoom({ view }: { view: InterviewView }) {
  const current = view.turns[view.turns.length - 1];
  const open = view.status === "active" && current && !current.answeredAt;
  return (
    <div className="flex flex-col gap-6">
      {view.status === "completed" && (
        <>
          <PendingRefresh active={view.feedback.status === "pending"} />
          <AiFeedbackView state={view.feedback} />
        </>
      )}
      <Transcript turns={view.turns} showReasons={view.mode !== "mock" || view.status === "completed"} />
      {open && <Answering key={current.id} view={view} turn={current} />}
      {view.status === "active" && !open && <Waiting view={view} />}
    </div>
  );
}
