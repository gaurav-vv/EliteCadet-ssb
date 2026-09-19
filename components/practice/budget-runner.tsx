"use client";

import { useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PracticeItem } from "@/types/practice";

interface BudgetRunnerProps {
  items: PracticeItem[];
  totalSeconds: number;
  onDone: (responses: Record<string, string>) => void;
}

export function BudgetRunner({ items, totalSeconds, onDone }: BudgetRunnerProps) {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const secondsLeft = useCountdown(totalSeconds, () => onDone(responses));
  const item = items[index];

  function updateResponse(value: string) {
    setResponses((r) => ({ ...r, [item.id]: value }));
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>
          Item {index + 1} of {items.length}
        </span>
        <span aria-live="polite">
          {minutes}:{seconds.toString().padStart(2, "0")} left
        </span>
      </div>
      <div className="glass-surface px-6 py-6 text-text-primary">{item.prompt}</div>
      <Textarea
        placeholder="Type your response…"
        value={responses[item.id] ?? ""}
        onChange={(e) => updateResponse(e.target.value)}
        className="min-h-28"
      />
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          Previous
        </Button>
        {index + 1 < items.length ? (
          <Button type="button" size="sm" onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => onDone(responses)}>
            Finish now
          </Button>
        )}
      </div>
    </div>
  );
}
