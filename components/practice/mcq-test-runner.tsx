"use client";

import { useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Button } from "@/components/ui/button";
import type { McqItem } from "@/types/ssb-journey";

interface McqTestRunnerProps {
  items: McqItem[];
  totalSeconds: number;
  onDone: (answers: Record<string, string>) => void;
}

// Timed, single-sitting MCQ test — the OIR/OIR Non-verbal Test counterpart to
// budget-runner.tsx's free-text version: one shared countdown across every
// item, free navigation within it, no correctness feedback until submission.
export function McqTestRunner({ items, totalSeconds, onDone }: McqTestRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const secondsLeft = useCountdown(totalSeconds, () => onDone(answers));
  const item = items[index];

  function selectOption(optionId: string) {
    setAnswers((a) => ({ ...a, [item.id]: optionId }));
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-secondary">
        <span>
          Item {index + 1} of {items.length}
        </span>
        <span aria-live="polite">
          {minutes}:{seconds.toString().padStart(2, "0")} left
        </span>
      </div>
      <div className="glass-regular px-6 py-6 text-ink">{item.prompt}</div>
      <div className="flex flex-col gap-2">
        {item.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectOption(option.id)}
            data-selected={answers[item.id] === option.id ? "true" : undefined}
            className="mcq-option glass-thin row-hover-tint rounded-control px-4 py-2.5 text-left text-sm text-ink"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </Button>
        {index + 1 < items.length ? (
          <Button type="button" size="sm" onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => onDone(answers)}>
            Finish now
          </Button>
        )}
      </div>
    </div>
  );
}
