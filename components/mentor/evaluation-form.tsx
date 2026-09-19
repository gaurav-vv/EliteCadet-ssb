"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitEvaluationAction } from "@/lib/actions/mentor";
import type { EvaluationInput } from "@/types/mentor";

interface EvaluationFormProps {
  mentees: { id: string; fullName: string }[];
  defaultMenteeId?: string;
}

interface Draft {
  menteeId: string;
  activityOrSession: string;
  score: string;
  strengths: string;
  improvementAreas: string;
  comments: string;
}

function draftKey(menteeId: string) {
  return `ssb-evaluation-draft-${menteeId || "unassigned"}`;
}

function emptyDraft(menteeId: string): Draft {
  return { menteeId, activityOrSession: "", score: "", strengths: "", improvementAreas: "", comments: "" };
}

function loadDraft(menteeId: string): Draft {
  if (typeof window === "undefined") return emptyDraft(menteeId);
  try {
    const saved = window.localStorage.getItem(draftKey(menteeId));
    return saved ? { ...emptyDraft(menteeId), ...JSON.parse(saved) } : emptyDraft(menteeId);
  } catch {
    return emptyDraft(menteeId);
  }
}

export function EvaluationForm({ mentees, defaultMenteeId }: EvaluationFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(defaultMenteeId ?? mentees[0]?.id ?? ""));
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  function update(patch: Partial<Draft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(draftKey(next.menteeId), JSON.stringify(next));
      } catch {
        // Private browsing / blocked storage — the form still works, the
        // draft just won't survive a refresh.
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const input: EvaluationInput = {
      menteeId: draft.menteeId,
      activityOrSession: draft.activityOrSession,
      score: Number(draft.score),
      strengths: draft.strengths,
      improvementAreas: draft.improvementAreas,
      comments: draft.comments,
    };

    const result = await submitEvaluationAction(input, idempotencyKey);

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    try {
      window.localStorage.removeItem(draftKey(draft.menteeId));
    } catch {
      // See note above.
    }
    setStatus("success");
    router.push(`/mentor/mentees/${draft.menteeId}`);
    router.refresh();
  }

  if (mentees.length === 0) {
    return (
      <Alert>
        <AlertDescription>You don&apos;t have any mentees to evaluate yet.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-8">
      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="menteeId">Mentee</Label>
          <Select value={draft.menteeId} onValueChange={(value) => setDraft(loadDraft(value))}>
            <SelectTrigger id="menteeId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mentees.map((mentee) => (
                <SelectItem key={mentee.id} value={mentee.id}>
                  {mentee.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activityOrSession">Activity or session</Label>
          <Input
            id="activityOrSession"
            placeholder="e.g. TAT Set 5"
            required
            value={draft.activityOrSession}
            onChange={(e) => update({ activityOrSession: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="score">Score (0–100)</Label>
          <Input
            id="score"
            type="number"
            min={0}
            max={100}
            required
            value={draft.score}
            onChange={(e) => update({ score: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="strengths">Strengths</Label>
          <Textarea
            id="strengths"
            required
            value={draft.strengths}
            onChange={(e) => update({ strengths: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="improvementAreas">Improvement areas</Label>
          <Textarea
            id="improvementAreas"
            required
            value={draft.improvementAreas}
            onChange={(e) => update({ improvementAreas: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comments">Comments (optional)</Label>
          <Textarea
            id="comments"
            value={draft.comments}
            onChange={(e) => update({ comments: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Submitting…" : "Submit evaluation"}
        </Button>
      </form>
    </div>
  );
}
