"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startInterviewAction } from "@/lib/actions/interview";
import { readPiq } from "@/lib/student/piq-storage";
import type { PiqInput } from "@/lib/practice/piq-questions";
import type { InterviewMode, InterviewTopic } from "@/types/interview";
import { cn } from "cn";

const MODES: { value: InterviewMode; title: string; detail: string }[] = [
  { value: "guided", title: "Guided", detail: "5 questions at your own pace, with the reason behind each follow-up." },
  { value: "topic", title: "One topic", detail: "5 questions that stay on a topic you choose." },
  { value: "mock", title: "Mock interview", detail: "8 questions, 2 minutes each, no hints — like the real thing." },
];

export function InterviewStart({ topics }: { topics: InterviewTopic[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<InterviewMode>("guided");
  const [topic, setTopic] = useState(topics[0]?.slug ?? "");
  const [piq, setPiq] = useState<PiqInput | null>(null);
  const [usePiq, setUsePiq] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // The PIQ lives on this device only; it's sent only if the student ticks the box.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe localStorage read
    setPiq(readPiq());
  }, []);

  async function start() {
    setPending(true);
    setError(null);
    const result = await startInterviewAction(mode, mode === "topic" ? topic : null, usePiq ? piq : null);
    if (result.ok && result.data) router.push(`/student/practice/interview/ai/${result.data.id}`);
    else {
      setPending(false);
      setError(result.error?.message ?? "We couldn't start the interview. Please try again.");
    }
  }

  const hasPiq = piq !== null && Object.values(piq).some((v) => typeof v === "string" && v.trim());
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="sr-only">Kind of interview</legend>
        {MODES.map((m) => (
          <label key={m.value} data-active={mode === m.value} className={cn("glass-regular flex min-h-11 cursor-pointer flex-col gap-1 rounded-card border px-5 py-4", mode === m.value ? "border-brand-accent" : "border-transparent")}>
            <span className="flex items-center gap-2">
              <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="size-4 accent-[var(--brand-accent)]" />
              <span className="text-sm font-semibold text-ink">{m.title}</span>
            </span>
            <span className="text-[13px] text-ink-secondary">{m.detail}</span>
          </label>
        ))}
      </fieldset>
      {mode === "topic" && (
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="interview-topic">Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger id="interview-topic" className="min-h-11">
              <SelectValue placeholder="Choose a topic" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {hasPiq && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={usePiq} onChange={(e) => setUsePiq(e.target.checked)} className="size-4 accent-[var(--brand-accent)]" />
          Use my PIQ details so questions can draw on them (shared with this interview only)
        </label>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <Button type="button" onClick={start} disabled={pending || (mode === "topic" && !topic)} className="min-h-11 self-start">
        {pending ? "Starting…" : "Start interview"}
      </Button>
    </div>
  );
}
