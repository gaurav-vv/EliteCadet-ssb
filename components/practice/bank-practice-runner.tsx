"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isItemDone, setItemDone } from "@/lib/student/ssb-journey-progress";
import type { McqItem } from "@/types/ssb-journey";
import type { PracticeItem } from "@/types/practice";

interface BankPracticeRunnerProps {
  dayId: string;
  moduleId: string;
  backHref: string;
  backLabel: string;
  mcqItems?: McqItem[];
  responseItems?: PracticeItem[];
}

// Untimed, self-paced practice: unlike the timed Test flow (mcq-test-runner /
// the existing carousel/budget runners), a student can browse freely, answer
// out of order, and revisit items — completion is saved per item so the
// progress ring (journey-progress-ring.tsx) reflects real, incremental work
// rather than a single all-or-nothing submission.
export function BankPracticeRunner({ dayId, moduleId, backHref, backLabel, mcqItems, responseItems }: BankPracticeRunnerProps) {
  const items = mcqItems ?? responseItems ?? [];
  const [index, setIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");
  // Starts empty (matching SSR) and is filled in after mount — a direct
  // isItemDone() call in the render body, even via a useState lazy
  // initializer, reruns on the client's hydration pass too and would return
  // a different result than the server saw once any item is actually done,
  // producing a hydration text mismatch (React error #418). See
  // journey-progress-ring.tsx for the fuller explanation.
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe external-store (localStorage) read, not derived state
    setDoneIds(new Set(items.filter((i) => isItemDone(dayId, moduleId, i.id)).map((i) => i.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on mount; `items` is a fresh array from the server each render
  }, []);

  const item = items[index];
  const doneCount = doneIds.size;
  const isMcq = mcqItems !== undefined;

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setSelectedOptionId(null);
    setRevealed(false);
    setDraft("");
  }

  function markCurrentDone() {
    setItemDone(dayId, moduleId, item.id, true);
    setDoneIds((prev) => new Set(prev).add(item.id));
  }

  function handleMcqCheck() {
    if (!selectedOptionId) return;
    setRevealed(true);
    markCurrentDone();
  }

  if (!item) return null;

  const mcqItem = isMcq ? (item as McqItem) : null;
  const done = doneIds.has(item.id);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-secondary">
        <span>
          Item {index + 1} of {items.length}
        </span>
        <span>{doneCount} of {items.length} done</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full bg-brand-accent transition-[width]"
          style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }}
        />
      </div>

      <div className="glass-regular flex flex-col gap-4 px-6 py-8">
        <p className="text-center text-ink">{item.prompt}</p>

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
              <p className="text-xs text-ink-secondary">
                {selectedOptionId === mcqItem.correctOptionId ? "Correct." : "Not quite — the highlighted option was correct."}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Type your response…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-28"
            />
            {!done && (
              <Button type="button" size="sm" onClick={markCurrentDone} className="self-start">
                Mark done
              </Button>
            )}
            {done && <p className="text-xs text-success">Marked done.</p>}
          </div>
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
