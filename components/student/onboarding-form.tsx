"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CapsuleSmall } from "@/components/ui/capsule";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitOnboarding } from "@/lib/api/student";
import { writeStoredProfile } from "@/lib/student/profile-storage";
import { updateFullName } from "@/lib/auth/update-profile";
import type { OnboardingInput, PreparationStage, TargetExam } from "@/types/student";

// No backend yet (T013/T014 deferred — status.md, 2026-09-18): the draft and
// the "already onboarded" flag live in localStorage, scoped to this browser
// only. Real, account-scoped persistence replaces this once auth lands.
const DRAFT_KEY = "ssb-onboarding-draft";
const COMPLETE_KEY = "ssb-onboarding-complete";

const TARGET_EXAM_LABEL: Record<TargetExam, string> = {
  cds: "CDS",
  afcat: "AFCAT",
  nda: "NDA",
  ssc: "SSC",
  other: "Other",
};

const STAGE_OPTIONS: { value: PreparationStage; label: string }[] = [
  { value: "just_starting", label: "Just starting" },
  { value: "in_progress", label: "In progress" },
  { value: "final_stretch", label: "Final stretch" },
];

type Draft = Omit<OnboardingInput, "academyName"> & { academyName: string };

function emptyDraft(defaultFullName: string): Draft {
  return {
    fullName: defaultFullName,
    targetExam: "cds",
    preparationStage: "just_starting",
    academyName: "",
    goals: "",
  };
}

// Read once, lazily, as the initial state itself rather than in an effect —
// localStorage isn't available during the server render, so `typeof window`
// guards that case; on the client this runs during the very first render.
function loadDraft(defaultFullName: string): Draft {
  const fallback = emptyDraft(defaultFullName);
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch {
    return fallback;
  }
}

function loadAlreadyComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COMPLETE_KEY) === "true";
  } catch {
    return false;
  }
}

interface OnboardingFormProps {
  defaultFullName?: string;
}

export function OnboardingForm({ defaultFullName = "" }: OnboardingFormProps) {
  const [draft, setDraft] = useState<Draft>(() => loadDraft(defaultFullName));
  const [alreadyComplete] = useState<boolean>(loadAlreadyComplete);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // See note above.
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setFieldErrors({});

    const input: OnboardingInput = {
      ...draft,
      academyName: draft.academyName.trim() ? draft.academyName.trim() : null,
    };

    const result = await submitOnboarding(input);

    if (!result.ok) {
      setStatus("error");
      if (result.error?.code === "validation_error") {
        setFieldErrors({ form: result.error.message });
      }
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    // Best-effort: keep the real Supabase account name in sync with whatever
    // the student entered here. Not fatal if it fails — onboarding still
    // completes, since the name they typed at signup remains valid.
    await updateFullName(input.fullName);

    writeStoredProfile(input);
    try {
      localStorage.setItem(COMPLETE_KEY, "true");
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // See note above.
    }
    setStatus("success");
  }

  if (alreadyComplete) {
    return (
      <div className="glass-surface flex flex-col items-center gap-3 px-8 py-10 text-center">
        <h1 className="text-xl font-semibold text-text-primary">You&apos;re already set up</h1>
        <p className="text-sm text-text-muted">Onboarding is already complete for this account.</p>
        <Button asChild size="sm">
          <Link href="/student">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="glass-surface flex flex-col items-center gap-3 px-8 py-10 text-center">
        <h1 className="text-xl font-semibold text-text-primary">You&apos;re all set, {draft.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted">Your preparation profile is ready.</p>
        <Button asChild size="sm">
          <Link href="/student">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-surface flex flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Tell us about your preparation</h1>
        <p className="text-sm text-text-muted">
          This personalizes your dashboard, missions and recommendations.
        </p>
      </div>

      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            aria-invalid={Boolean(fieldErrors.fullName)}
            value={draft.fullName}
            onChange={(e) => updateDraft({ fullName: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetExam">Target exam</Label>
          <Select
            value={draft.targetExam}
            onValueChange={(value) => updateDraft({ targetExam: value as TargetExam })}
          >
            <SelectTrigger id="targetExam" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TARGET_EXAM_LABEL) as TargetExam[]).map((exam) => (
                <SelectItem key={exam} value={exam}>
                  {TARGET_EXAM_LABEL[exam]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Preparation stage</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preparation stage">
            {STAGE_OPTIONS.map((option) => (
              <CapsuleSmall
                key={option.value}
                label={option.label}
                selected={draft.preparationStage === option.value}
                onClick={() => updateDraft({ preparationStage: option.value })}
                role="radio"
                aria-checked={draft.preparationStage === option.value}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="academyName">Academy (optional)</Label>
          <Input
            id="academyName"
            placeholder="If you're preparing with an academy, add its name"
            value={draft.academyName}
            onChange={(e) => updateDraft({ academyName: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goals">Preparation goals</Label>
          <Textarea
            id="goals"
            required
            aria-invalid={Boolean(fieldErrors.goals)}
            placeholder="What do you want to achieve in your SSB preparation?"
            value={draft.goals}
            onChange={(e) => updateDraft({ goals: e.target.value })}
            disabled={status === "loading"}
          />
        </div>

        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving…" : "Complete onboarding"}
        </Button>
      </form>
    </div>
  );
}
