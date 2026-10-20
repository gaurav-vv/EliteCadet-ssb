"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBankTimingAction } from "@/lib/actions/practice";
import { PRACTICE_TIMING, timingLabel, type TimingConfig } from "@/lib/practice/config";
import type { PsychologyTestType } from "@/types/practice";

// Super Admin: the timer students get for this psychology test (FR-PSY-01).
// The shape follows the test (one timer per item, or one for the whole test).
export function TimerForm({ test, current }: { test: PsychologyTestType; current: TimingConfig | null }) {
  const router = useRouter();
  const standard = PRACTICE_TIMING[test];
  const active = current ?? standard;
  const [view, setView] = useState(active.mode === "carousel" ? String(active.stimulusSeconds ?? "") : "");
  const [write, setWrite] = useState(active.mode === "carousel" ? String(active.responseSeconds) : "");
  const [total, setTotal] = useState(active.mode === "budget" ? String(active.totalSeconds / 60) : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function save(timing: TimingConfig | null) {
    setPending(true);
    const result = await setBankTimingAction(test, timing);
    setPending(false);
    setMessage(result.ok ? { ok: true, text: timing ? "Timer saved. Students get it on their next attempt." : "Back to the standard timer." } : { ok: false, text: result.error?.message ?? "We couldn't save the timer." });
    if (result.ok) router.refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const timing: TimingConfig =
      standard.mode === "carousel"
        ? { mode: "carousel", responseSeconds: Number(write), ...(standard.stimulusSeconds !== undefined ? { stimulusSeconds: Number(view) } : {}) }
        : { mode: "budget", totalSeconds: Math.round(Number(total) * 60) };
    void save(timing);
  }

  const id = `timer-${test}`;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-[13px] text-ink-secondary">
        Now: <span className="text-ink">{timingLabel(active)}</span>
        {current ? " (changed)" : " (standard)"}. Standard: {timingLabel(standard)}.
      </p>
      <div className="flex flex-wrap gap-4">
        {standard.mode === "carousel" ? (
          <>
            {standard.stimulusSeconds !== undefined && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-view`}>Picture shown (seconds, 0–120)</Label>
                <Input id={`${id}-view`} inputMode="numeric" value={view} onChange={(e) => setView(e.target.value)} className="min-h-11 w-40" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-write`}>Time per item (seconds, 5–900)</Label>
              <Input id={`${id}-write`} inputMode="numeric" value={write} onChange={(e) => setWrite(e.target.value)} className="min-h-11 w-40" />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-total`}>Whole test (minutes, 1–120)</Label>
            <Input id={`${id}-total`} inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} className="min-h-11 w-40" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="min-h-11">
          Save timer
        </Button>
        {current && (
          <Button type="button" variant="outline" disabled={pending} onClick={() => void save(null)} className="min-h-11">
            Use standard timer
          </Button>
        )}
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-[13px] text-ink" : "text-[13px] text-danger"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
