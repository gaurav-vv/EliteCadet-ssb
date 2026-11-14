"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveMentorProfileAction } from "@/lib/actions/mentor";
import {
  MENTOR_BIO_MAX,
  type MentorProfile,
  type MentorProfileErrors,
  type MentorProfileInput,
} from "@/types/mentor";

interface MentorProfileFormProps {
  initial: MentorProfile;
}

export function MentorProfileForm({ initial }: MentorProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<MentorProfileInput>({
    fullName: initial.fullName,
    bio: initial.bio,
    expertise: initial.expertise.join(", "),
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MentorProfileErrors>({});

  function update<K extends keyof MentorProfileInput>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (status === "saved") setStatus("idle");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      const result = await saveMentorProfileAction(values);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.error?.message ?? "We couldn't save your profile. Please try again.");
        setStatus("error");
        return;
      }
      setFieldErrors({});
      setMessage(null);
      setStatus("saved");
      router.refresh();
    } catch {
      // Network failure: keep what the mentor typed on screen.
      setMessage("We couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-8 max-sm:px-5 max-sm:py-6">
      <div role="status" aria-live="polite">
        {status === "saved" && (
          <Alert>
            <AlertDescription>Your profile was saved.</AlertDescription>
          </Alert>
        )}
      </div>
      {status === "error" && message && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            value={values.fullName}
            aria-invalid={!!fieldErrors.fullName}
            aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
            onChange={(e) => update("fullName", e.target.value)}
          />
          {fieldErrors.fullName && (
            <p id="fullName-error" className="text-[13px] text-status-danger">
              {fieldErrors.fullName}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expertise">Areas you mentor</Label>
          <Input
            id="expertise"
            placeholder="e.g. TAT, Interview, GTO tasks"
            value={values.expertise}
            aria-invalid={!!fieldErrors.expertise}
            aria-describedby={fieldErrors.expertise ? "expertise-error" : "expertise-hint"}
            onChange={(e) => update("expertise", e.target.value)}
          />
          {fieldErrors.expertise ? (
            <p id="expertise-error" className="text-[13px] text-status-danger">
              {fieldErrors.expertise}
            </p>
          ) : (
            <p id="expertise-hint" className="text-[13px] text-ink-secondary">
              Separate areas with commas.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={5}
            placeholder="Your background and how you help candidates prepare."
            value={values.bio}
            maxLength={MENTOR_BIO_MAX}
            aria-invalid={!!fieldErrors.bio}
            aria-describedby={fieldErrors.bio ? "bio-error" : "bio-count"}
            onChange={(e) => update("bio", e.target.value)}
          />
          {fieldErrors.bio ? (
            <p id="bio-error" className="text-[13px] text-status-danger">
              {fieldErrors.bio}
            </p>
          ) : (
            <p id="bio-count" className="text-[13px] text-ink-secondary">
              {values.bio.length}/{MENTOR_BIO_MAX}
            </p>
          )}
        </div>
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
