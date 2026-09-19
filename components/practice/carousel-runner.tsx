"use client";

import { useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Textarea } from "@/components/ui/textarea";
import type { PracticeItem } from "@/types/practice";
import type { CarouselTiming } from "@/lib/practice/config";

type Phase = "view" | "respond";

interface CarouselRunnerProps {
  items: PracticeItem[];
  timing: CarouselTiming;
  onDone: (responses: Record<string, string>) => void;
}

export function CarouselRunner({ items, timing, onDone }: CarouselRunnerProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(timing.stimulusSeconds ? "view" : "respond");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");

  const item = items[index];

  function commitAndAdvance() {
    const nextResponses = { ...responses, [item.id]: draft };

    if (index + 1 >= items.length) {
      onDone(nextResponses);
      return;
    }

    setResponses(nextResponses);
    setDraft("");
    setIndex((i) => i + 1);
    setPhase(timing.stimulusSeconds ? "view" : "respond");
  }

  function handleExpire() {
    if (phase === "view") {
      setPhase("respond");
      return;
    }
    commitAndAdvance();
  }

  const seconds = phase === "view" ? (timing.stimulusSeconds ?? 0) : timing.responseSeconds;

  return (
    <CarouselStep
      key={`${item.id}-${phase}`}
      seconds={seconds}
      onExpire={handleExpire}
      prompt={item.prompt}
      phase={phase}
      index={index}
      total={items.length}
      draft={draft}
      onDraftChange={setDraft}
    />
  );
}

interface CarouselStepProps {
  seconds: number;
  onExpire: () => void;
  prompt: string;
  phase: Phase;
  index: number;
  total: number;
  draft: string;
  onDraftChange: (value: string) => void;
}

function CarouselStep({
  seconds,
  onExpire,
  prompt,
  phase,
  index,
  total,
  draft,
  onDraftChange,
}: CarouselStepProps) {
  const secondsLeft = useCountdown(seconds, onExpire);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-secondary">
        <span>
          Item {index + 1} of {total}
        </span>
        <span aria-live="polite">{secondsLeft}s left</span>
      </div>
      <div className="glass-regular px-6 py-8 text-center text-ink">{prompt}</div>
      {phase === "respond" ? (
        <Textarea
          autoFocus
          placeholder="Type your response…"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          className="min-h-32"
        />
      ) : (
        <p className="text-center text-sm text-ink-secondary">
          Read the scene. The writing window opens automatically.
        </p>
      )}
    </div>
  );
}
