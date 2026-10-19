"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitDiagnosticAction } from "@/lib/actions/student";
import type { DiagnosticFormItem } from "@/types/diagnostic";

// Low-pressure on purpose (PRD §9.3): no timer, every question can be
// skipped, and nothing is marked right or wrong while answering.
export function DiagnosticRunner({ items }: { items: DiagnosticFormItem[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId?: string; response?: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const item = items[index];
  if (!item) return null;
  const answer = answers[item.key] ?? {};
  const last = index === items.length - 1;
  const setAnswer = (patch: { optionId?: string; response?: string }) => setAnswers((a) => ({ ...a, [item.key]: { ...a[item.key], ...patch } }));

  async function submit() {
    setPending(true);
    setError(null);
    const result = await submitDiagnosticAction(Object.entries(answers).map(([key, v]) => ({ key, ...v })));
    if (result.ok && result.data) router.push(`/student/diagnostic/${result.data.id}`);
    else {
      setPending(false);
      setError(result.error?.message ?? "We couldn't save your diagnostic. Your answers are still here — please try again.");
    }
  }

  return (
    <section aria-labelledby="diag-q" className="glass-regular flex flex-col gap-5 rounded-card p-6">
      <div className="flex items-center justify-between text-[13px] text-ink-secondary">
        <span>
          Question {index + 1} of {items.length}
        </span>
        <span>{item.options ? "Choose one" : "A few sentences is plenty"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${((index + 1) / items.length) * 100}%` }} />
      </div>
      <h2 id="diag-q" className="text-[18px] font-semibold text-ink">
        {item.prompt}
      </h2>
      {item.options ? (
        <div role="radiogroup" aria-labelledby="diag-q" className="flex flex-col gap-2">
          {item.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={answer.optionId === o.id}
              onClick={() => setAnswer({ optionId: o.id })}
              data-selected={answer.optionId === o.id ? "true" : undefined}
              className="mcq-option glass-thin row-hover-tint min-h-11 rounded-control px-4 py-2.5 text-left text-sm text-ink"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <Textarea aria-label="Your answer" value={answer.response ?? ""} onChange={(e) => setAnswer({ response: e.target.value })} maxLength={2000} className="min-h-32" />
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={index === 0 || pending} onClick={() => setIndex((i) => i - 1)} className="min-h-11">
          Previous
        </Button>
        {last ? (
          <Button type="button" disabled={pending} onClick={() => void submit()} className="min-h-11">
            {pending ? "Saving…" : "Finish"}
          </Button>
        ) : (
          <Button type="button" onClick={() => setIndex((i) => i + 1)} className="min-h-11">
            {answer.optionId || answer.response?.trim() ? "Next" : "Skip"}
          </Button>
        )}
      </div>
    </section>
  );
}
