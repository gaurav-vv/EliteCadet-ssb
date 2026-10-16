"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionGuidance } from "@/components/practice/question-guidance";
import { SelfReviewChecklist } from "@/components/practice/self-review-checklist";
import { saveAnswerAction } from "@/lib/actions/practice";
import type { AnswerPatch, SavedPracticeAnswer } from "@/types/practice";
import type { GuidedPracticeItem, McqItem } from "@/types/ssb-journey";

interface BankPracticeRunnerProps {
  /** The practice bank (0014) these items belong to. */
  slug: string;
  /** Override where answers go (the PIQ page keeps them on the device); defaults to the student's account. */
  onSave?: (key: string, patch: AnswerPatch) => Promise<{ ok: boolean; error?: { message: string } }>;
  /** Shown under the answer box when saving somewhere other than the account. */
  saveNote?: string;
  backHref: string;
  backLabel: string;
  context?: string;
  mcqItems?: McqItem[];
  responseItems?: GuidedPracticeItem[];
  /** The student's saved answers, keyed by item id (read on the server). */
  initialAnswers: Record<string, SavedPracticeAnswer>;
  /** Free-text banks only: checklist shown under each answer, ticks saved with it. */
  selfReview?: string[];
  /** Optional links shown under the back link, e.g. the interview's PIQ and mock modes. */
  actions?: React.ReactNode;
}

type SaveState = "idle" | "saving" | "saved" | "error";
const SAVE_DELAY_MS = 900;

// Untimed, self-paced practice: browse freely, answer out of order, revisit.
// Every answer, tick and "done" is saved to the student's account (0014), so
// it follows them across devices and their mentor can read it. Typing is
// saved after a short pause; a failed save keeps the text on screen and
// offers a retry (AGENTS.md §11: never lose input).
export function BankPracticeRunner({ slug, onSave, saveNote, backHref, backLabel, context, mcqItems, responseItems, initialAnswers, selfReview, actions }: BankPracticeRunnerProps) {
  const items = mcqItems ?? responseItems ?? [];
  const isMcq = mcqItems !== undefined;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Partial<SavedPracticeAnswer>>>(initialAnswers);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const pending = useRef<{ key: string; patch: AnswerPatch } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = items[index];
  const current = item ? answers[item.id] : undefined;
  const doneCount = items.filter((i) => answers[i.id]?.done).length;

  async function send(key: string, patch: AnswerPatch) {
    setSaveState("saving");
    const result = onSave ? await onSave(key, patch) : await saveAnswerAction(slug, key, patch);
    if (result.ok) {
      setSaveState("saved");
      setSaveError(null);
    } else {
      pending.current = { key, patch: { ...pending.current?.patch, ...patch } };
      setSaveState("error");
      setSaveError(result.error?.message ?? "We couldn't save that. Your answer is still here.");
    }
  }

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (p) void send(p.key, p.patch);
  }

  // Save any typed text before leaving the page or switching question.
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps -- flush on unmount only

  function patchLocal(key: string, patch: Partial<SavedPracticeAnswer>) {
    setAnswers((a) => ({ ...a, [key]: { ...a[key], ...patch } }));
  }

  function queue(key: string, patch: AnswerPatch, immediate: boolean) {
    if (pending.current && pending.current.key !== key) flush();
    pending.current = { key, patch: { ...(pending.current?.key === key ? pending.current.patch : {}), ...patch } };
    if (timer.current) clearTimeout(timer.current);
    if (immediate) flush();
    else timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  function goTo(nextIndex: number) {
    flush();
    setIndex(nextIndex);
    setSelectedOptionId(null);
    setRevealed(false);
  }

  function handleDraftChange(text: string) {
    patchLocal(item.id, { text });
    queue(item.id, { text }, false);
  }

  function handleReviewChange(checked: string[]) {
    patchLocal(item.id, { selfReview: checked });
    queue(item.id, { selfReview: checked }, true);
  }

  function markCurrentDone() {
    patchLocal(item.id, { done: true });
    queue(item.id, { done: true }, true);
  }

  function handleMcqCheck() {
    if (!selectedOptionId) return;
    setRevealed(true);
    patchLocal(item.id, { done: true, optionId: selectedOptionId });
    queue(item.id, { optionId: selectedOptionId, done: true }, true);
  }

  if (!item) return null;

  const mcqItem = isMcq ? (item as McqItem) : null;
  const done = current?.done === true;
  const guidance = isMcq ? undefined : (item as GuidedPracticeItem).guidance;
  const statusText = saveNote ?? (saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved to your account." : "Your answer is saved to your account as you type.");

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        {context && <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{context}</p>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="flex items-center justify-between text-sm text-ink-secondary">
        <span>
          Item {index + 1} of {items.length}
        </span>
        <span>
          {doneCount} of {items.length} done
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-brand-accent transition-[width]" style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }} />
      </div>

      <div className="glass-regular flex flex-col gap-4 px-6 py-8">
        <p className="text-center text-ink">{item.prompt}</p>
        {guidance && <QuestionGuidance guidance={guidance} />}

        {mcqItem ? (
          <div className="flex flex-col gap-2">
            {mcqItem.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrect = option.id === mcqItem.correctOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelectedOptionId(option.id)}
                  data-selected={isSelected && !revealed ? "true" : undefined}
                  data-correct={revealed && isCorrect ? "true" : undefined}
                  data-incorrect={revealed && isSelected && !isCorrect ? "true" : undefined}
                  className="mcq-option glass-thin row-hover-tint rounded-control px-4 py-2.5 text-left text-sm text-ink"
                >
                  {option.label}
                </button>
              );
            })}
            {!revealed ? (
              <Button type="button" size="sm" disabled={!selectedOptionId} onClick={handleMcqCheck} className="mt-2 self-start">
                Check answer
              </Button>
            ) : (
              <p className="text-xs text-ink-secondary">{selectedOptionId === mcqItem.correctOptionId ? "Correct." : "Not quite — the highlighted option was correct."}</p>
            )}
            {done && !revealed && <p className="text-xs text-ink-secondary">You&apos;ve answered this one before.</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Textarea aria-label="Your answer" placeholder="Type your response…" value={current?.text ?? ""} onChange={(e) => handleDraftChange(e.target.value)} onBlur={flush} className="min-h-28" />
            {selfReview && selfReview.length > 0 && <SelfReviewChecklist items={selfReview} checked={current?.selfReview ?? []} onChange={handleReviewChange} />}
            {!done && (
              <Button type="button" size="sm" onClick={markCurrentDone} className="self-start">
                Mark done
              </Button>
            )}
            {done && <p className="text-xs text-success">Marked done.</p>}
          </div>
        )}

        {saveState === "error" ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-xs text-danger">
            <span>{saveError}</span>
            <Button type="button" variant="outline" size="sm" onClick={flush}>
              Retry save
            </Button>
          </div>
        ) : (
          !isMcq && (
            <p className="text-xs text-ink-secondary" aria-live="polite">
              {statusText}
            </p>
          )
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => goTo(index - 1)}>
          Previous
        </Button>
        <Button type="button" size="sm" disabled={index + 1 >= items.length} onClick={() => goTo(index + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
