"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { validateOnboardingInput } from "@/lib/api/student";
import { readStoredProfile, writeStoredProfile } from "@/lib/student/profile-storage";
import { updateFullName } from "@/lib/auth/update-profile";
import type { OnboardingInput, PreparationStage, TargetExam } from "@/types/student";

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

function fallbackProfile(realFullName: string): OnboardingInput {
  return {
    fullName: realFullName,
    targetExam: "cds",
    preparationStage: "just_starting",
    academyName: null,
    goals: "",
  };
}

type FormValues = Omit<OnboardingInput, "academyName"> & { academyName: string };

function loadInitialValues(realFullName: string): FormValues {
  const stored = readStoredProfile();
  const profile = stored ?? fallbackProfile(realFullName);
  return { ...profile, fullName: stored?.fullName || realFullName, academyName: profile.academyName ?? "" };
}

interface ProfileFormProps {
  realFullName: string;
}

export function ProfileForm({ realFullName }: ProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => loadInitialValues(realFullName));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const input: OnboardingInput = {
      ...values,
      academyName: values.academyName.trim() ? values.academyName.trim() : null,
    };

    const errors = validateOnboardingInput(input);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus("error");
      return;
    }

    const nameResult = await updateFullName(input.fullName);
    if (!nameResult.ok) {
      setFieldErrors({ fullName: nameResult.message ?? "Something went wrong." });
      setStatus("error");
      return;
    }

    setFieldErrors({});
    writeStoredProfile(input);
    setStatus("saved");
    router.refresh();
  }

  return (
    <div className="glass-surface flex flex-col gap-6 px-8 py-8">
      {status === "saved" && (
        <Alert>
          <AlertDescription>Your profile was updated.</AlertDescription>
        </Alert>
      )}
      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>Fix the highlighted fields and save again.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            aria-invalid={Boolean(fieldErrors.fullName)}
            value={values.fullName}
            onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          />
          {fieldErrors.fullName && <p className="text-xs text-danger">{fieldErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetExam">Target exam</Label>
          <Select
            value={values.targetExam}
            onValueChange={(value) => setValues((v) => ({ ...v, targetExam: value as TargetExam }))}
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
                selected={values.preparationStage === option.value}
                onClick={() => setValues((v) => ({ ...v, preparationStage: option.value }))}
                role="radio"
                aria-checked={values.preparationStage === option.value}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="academyName">Academy (optional)</Label>
          <Input
            id="academyName"
            value={values.academyName}
            onChange={(e) => setValues((v) => ({ ...v, academyName: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goals">Preparation goals</Label>
          <Textarea
            id="goals"
            aria-invalid={Boolean(fieldErrors.goals)}
            value={values.goals}
            onChange={(e) => setValues((v) => ({ ...v, goals: e.target.value }))}
          />
          {fieldErrors.goals && <p className="text-xs text-danger">{fieldErrors.goals}</p>}
        </div>

        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
